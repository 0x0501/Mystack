"""Build the letterpress workshop, editable Blender scene, batched GLBs and still SVGs."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for coll in list(bpy.data.collections):
    if coll.name != 'Collection' and coll.users == 0: bpy.data.collections.remove(coll)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x = 1200
scene.render.resolution_y = 980
scene.render.resolution_percentage = 100
scene.world.color = (.1,.1,.1)
modules = {}
current = None
active_motion = "body"

def module(key, label, category, variant, center, offset):
    global current, active_motion
    active_motion = "body"
    collection = bpy.data.collections.new(key)
    scene.collection.children.link(collection)
    modules[key] = dict(id=key, label=label, category=category, variant=variant,
        center=list(center), offset=list(offset), objects=[], collection=collection, motions={})
    current = key

def own(obj, name):
    obj.name = f'{current}.{name}'
    for c in list(obj.users_collection): c.objects.unlink(obj)
    modules[current]['collection'].objects.link(obj)
    modules[current]['objects'].append(obj)
    obj['assembly_module'] = current
    obj['motion_group'] = active_motion
    return obj

def box(name, p, size, bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    o=own(bpy.context.object,name); o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Machined edge','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def cyl(name,p,r,h,axis='Z',vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=p)
    o=own(bpy.context.object,name)
    o['axis_symmetric']=axis=='Z'
    if axis=='X':o.rotation_euler[1]=math.pi/2
    if axis=='Y':o.rotation_euler[0]=math.pi/2
    mod=o.modifiers.new('Rim','BEVEL');mod.width=min(.025,h/5);mod.segments=1
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def ring(name,p,outer,inner,h,segments=32):
    verts=[]
    for z,r in [(-h/2,outer),(h/2,outer),(-h/2,inner),(h/2,inner)]:
        verts.extend([(p[0]+r*math.cos(i*2*math.pi/segments),p[1]+r*math.sin(i*2*math.pi/segments),p[2]+z) for i in range(segments)])
    faces=[]
    for i in range(segments):
        j=(i+1)%segments
        faces += [(i,j,segments+j,segments+i),(segments+i,segments+j,3*segments+j,3*segments+i),(2*segments+i,3*segments+i,3*segments+j,2*segments+j)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);modules[current]['collection'].objects.link(o)
    modules[current]['objects'].append(o);o.name=f'{current}.{name}';o['assembly_module']=current;o['motion_group']=active_motion;o['axis_symmetric']=True
    return o

def screw(name,x,y,z):
    cyl(name,(x,y,z),.085,.07,vertices=12)
    box(name+'-slot',(x,y,z+.039),(.085,.018,.008),0)

def motion(key, pivot=(0,0,0), axis=(0,0,1)):
    global active_motion
    active_motion=key
    modules[current]['motions'][key]=dict(pivot=list(pivot),axis=list(axis))
def still():
    global active_motion
    active_motion='body'
def rotate_recent(start, pivot, axis, angle):
    bpy.context.view_layer.update()
    transform=Matrix.Translation(Vector(pivot))@Matrix.Rotation(angle,4,axis)@Matrix.Translation(-Vector(pivot))
    for o in modules[current]['objects'][start:]:o.matrix_world=transform@o.matrix_world

def wheel(name,p,r=1,teeth=False):
    x,y,z=p
    ring(name+'-rim',p,r,r*.78,.16,48)
    cyl(name+'-hub',p,r*.2,.3)
    for i in range(6):
        a=i*math.tau/6;o=box(name+'-spoke',(x+math.cos(a)*r*.45,y+math.sin(a)*r*.45,z),(.72*r,.11*r,.1),.025);o.rotation_euler[2]=a
    if teeth:
        for i in range(24):
            a=i*math.tau/24;o=box(name+'-tooth',(x+math.cos(a)*r*.97,y+math.sin(a)*r*.97,z),(.16*r,.1*r,.18),.015);o.rotation_euler[2]=a

def vertical_wheel(name,p,r=1,teeth=False):
    start=len(modules[current]['objects']);wheel(name,p,r,teeth);rotate_recent(start,p,'Y',math.pi/2)

def letters(text,p,size=.35):
    curve=bpy.data.curves.new('Cast letters','FONT');curve.body=text;curve.align_x='CENTER';curve.size=size;curve.extrude=.012
    obj=bpy.data.objects.new('lettering',curve);scene.collection.objects.link(obj);obj.location=p
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.convert(target='MESH');own(bpy.context.object,'lettering')
    bpy.context.object.select_set(False)

def bearing(x,y,z):
    box('bearing-pillow',(x,y,z),(.4,.55,.6),.1)
    for dy in [-.2,.2]:screw('bearing-bolt',x,y+dy,z+.32)

# A single open platen press: cast frame, chase, linked crank and paper delivery.
module('chassis','Cast-iron platen press','base','all',(0,0,2),(0,0,0))
box('cast-bed',(0,.3,.25),(6.2,5.6,.5),.22)
for x in [-2.5,2.5]:
    for y in [-1.9,2.4]:
        box('splayed-foot',(x,y,-.15),(.75,.9,.3),.12)
        screw('bed-bolt',x,y,.55)
for x in [-2.35,2.35]:
    box('cast-upright',(x,-.45,2.7),(.48,.65,4.4),.16)
    box('upright-plinth',(x,-.45,.8),(.85,1,.45),.12)
    bearing(x,0,4.4)
box('crown',(0,-.45,4.85),(5.1,.7,.45),.16)
for x in [-1.8,1.8]:
    cyl('platen-guide',(x,0,2.6),.11,3.8)
    for z in [.8,4.3]:ring('guide-gland',(x,0,z),.22,.12,.16)
box('type-bed',(0,0,.78),(4.2,3.1,.35),.1)
for x in [-2,2]:box('chase-rail',(x,0,1.0),(.12,3.2,.18),.03)
box('delivery-table',(0,3.1,.8),(4.5,1.4,.16),.08)
for x in [-2,2]:cyl('delivery-support',(x,3.1,.5),.1,.55)
box('maker-plate',(0,2.97,.35),(2.4,.07,.28),.03)

module('backplane','Crank, platen and paper','core','all',(0,0,2.5),(0,0,0))
cyl('drive-shaft',(0,0,4.4),.13,6.7,'X')
motion('crank',(0,0,4.4),(1,0,0))
vertical_wheel('crank-disc',(0,0,4.4),.55,True)
cyl('eccentric-pin',(0,0,4.8),.13,.6,'X')
still()
motion('connecting-rod',(0,0,4.8),(1,0,0))
box('connecting-rod',(.32,0,4.2),(.16,.18,1.2),.045)
for z in [3.6,4.8]:cyl('rod-eye',(.32,0,z),.19,.2,'X')
still()
motion('platen')
box('platen',(0,0,2.005),(3.9,2.8,.2),.08)
for x in [-1.8,1.8]:cyl('guide-sleeve',(x,0,2.05),.22,.5)
cyl('pressure-screw',(0,0,2.7),.14,1.6)
for z in [2.15,2.35,2.55,2.75]:ring('screw-thread',(0,0,z),.19,.14,.05)
box('slider-crosshead',(0,0,3.6),(1.3,.4,.3),.06)
still()
motion('sheet')
box('cotton-paper',(0,3,1.095),(3.35,2.5,.018),0)
# Crop marks belong to the print, not to the surrounding interface.
still()
motion('impression');letters('MYSTACK',(0,2.8,1.108),.45);still()

for variant in ['cloudflare','nitro','bun']:
    p=(-3.1,0,4.4)
    module('runtime-'+variant,{'cloudflare':'Enclosed turbine drive','nitro':'Three-cylinder drive','bun':'Direct flywheel drive'}[variant],'deployment',variant,p,(-2,0,.6))
    bearing(-2.95,0,4.4)
    if variant=='cloudflare':
        start=len(modules[current]['objects']);ring('turbine-casing',p,1.2,.99,.3,48);rotate_recent(start,p,'Y',math.pi/2)
        motion('drive',p,(1,0,0));start=len(modules[current]['objects'])
        cyl('turbine-hub',p,.23,.4)
        for i in range(12):
            a=i*math.tau/12;o=box('turbine-vane',(p[0]+.65*math.cos(a),p[1]+.65*math.sin(a),p[2]),(.75,.15,.14),.04);o.rotation_euler[2]=a+.35
        rotate_recent(start,p,'Y',math.pi/2);still()
    elif variant=='bun':
        motion('drive',p,(1,0,0));vertical_wheel('flywheel',p,1.35)
        cyl('handle',(-3.35,0,5.35),.1,.5,'X');still()
    else:
        for i in range(3):
            x=-3.6+i*.65
            cyl('cylinder',(x,0,3.45),.25,.7)
            for z in [3.2,3.35,3.5,3.65]:ring('cooling-rib',(x,0,z),.3,.24,.04)
            motion('piston-'+str(i));cyl('piston-rod',(x,0,4),.07,.65);cyl('piston-cap',(x,0,3.75),.2,.12);still()
        motion('drive',p,(1,0,0));vertical_wheel('power-wheel',p,.85,True);still()
    box('engine-bracket',(-2.9,-.45,3.75),(.65,.55,1.2),.1)

for variant in ['pg','pg-hyperdrive','d1','turso-cloud','turso-local','bun-sqlite']:
    module('database-'+variant,{'pg':'Movable-type chase','pg-hyperdrive':'Register-adjusted chase','d1':'Circular seal die','turso-cloud':'Paired register dies','turso-local':'Single type bar','bun-sqlite':'One-piece printing plate'}[variant],'database',variant,(0,0,.98),(0,-3,.35))
    box('chase-floor',(0,0,.94),(3.7,2.6,.08),.03)
    if variant in ['pg','pg-hyperdrive']:
        for y in [-1.2,1.2]:box('chase-wall',(0,y,1.02),(3.65,.1,.14),.02)
        for j in range(3):
            for i in range(8):box('type-block',(-1.5+i*.43,-.8+j*.75,.99),(.36,.62,.12),.012)
        letters('MYSTACK',(0,-.2,1.06),.36)
        if variant=='pg-hyperdrive':
            for x in [-1.72,1.72]:
                cyl('register-screw',(x,0,1.05),.065,2.2,'Y')
                cyl('register-dial',(x,1.15,1.05),.2,.13,'Y',16)
    elif variant=='d1':
        cyl('seal',(0,0,1),1.1,.12,vertices=48)
        ring('seal-rim',(0,0,1.07),1.03,.98,.015,48);letters('M',(0,-.2,1.08),.65)
    elif variant=='turso-cloud':
        for x in [-.85,.85]:
            cyl('paired-seal',(x,0,1),.74,.12,vertices=32)
            ring('seal-border',(x,0,1.07),.68,.64,.015)
            letters('M',(x,-.2,1.08),.45)
        box('register-link',(0,.95,1.02),(2.6,.12,.1),.02)
    elif variant=='turso-local':
        box('type-bar',(0,0,1),(3.4,.85,.12),.04);letters('MYSTACK',(0,-.2,1.08),.39)
        for x in [-1.6,1.6]:screw('type-lock',x,.6,1)
    else:
        box('engraved-plate',(0,0,1),(2.8,1.85,.12),.1);letters('MYSTACK',(0,-.2,1.08),.37)
        for x in [-1.2,1.2]:
            for y in [-.7,.7]:screw('plate-fixing',x,y,1.08)

for variant in ['cloudflare','resend']:
    module('email-'+variant,'Roller-fed delivery' if variant=='cloudflare' else 'Hand-fed delivery tray','email',variant,(0,2.5,1),(0,2,.5))
    if variant=='cloudflare':
        for x in [-1.95,1.95]:bearing(x,2.2,1.1)
        motion('feed-roller',(0,2.2,1.15),(1,0,0))
        cyl('paper-roller',(0,2.2,1.15),.14,3.8,'X')
        for x in [-1.7,-.6,.6,1.7]:cyl('grip-wheel',(x,2.2,1.15),.23,.3,'X')
        still()
    else:
        for x in [-1.85,1.85]:box('paper-guide',(x,2.6,1.05),(.1,1.9,.2),.03)
        box('feed-stop',(0,3.45,.95),(3.8,.15,.15),.03)
        motion('feed-lever',(2.05,2.7,1.1),(1,0,0))
        box('lever',(2.05,2.8,1.35),(.13,.17,.8),.035);cyl('lever-knob',(2.05,2.8,1.8),.2,.2);still()

for i,variant in enumerate(['stripe','creem','nowpayments','polar']):
    x=-1.5+i
    module('payment-'+variant,{'stripe':'Numbering head','creem':'Embossing stamp','nowpayments':'Rotary date stamp','polar':'Seal stamp'}[variant],'payments',variant,(x,2.8,1.5),(0,1.5,1))
    box('stamp-arm',(x,2.4,1.5),(.16,.18,1.1),.04)
    box('stamp-bridge',(x,2.7,2),(.22,.8,.14),.03)
    motion('stamp')
    if variant=='stripe':
        for j in range(3):cyl('number-wheel',(x-.22+j*.22,2.95,1.55),.22,.18,'X',10)
    elif variant=='creem':box('embossing-head',(x,2.95,1.49),(.65,.5,.32),.05)
    elif variant=='nowpayments':cyl('date-wheel',(x,2.95,1.67),.34,.28,'X',12)
    else:cyl('seal-head',(x,2.95,1.48),.3,.3,vertices=32)
    cyl('stamp-spring',(x,2.95,1.75),.09,.35);still()

# Configuration: a composing stick and four rows of type entering a chase.
module('document-configuration','Composing stick and type chase','document','configuration',(0,0,.7),(0,0,0))
box('composing-bed',(0,0,.15),(6,3.8,.3),.12)
for y in [-1.8,1.8]:box('galley-rail',(0,y,.5),(6,.18,.55),.04)
box('fixed-stop',(-2.8,0,.5),(.2,3.6,.55),.04)
for j,word in enumerate(['START','DATA','MAIL','PAY']):
    motion('type-row-'+str(j));y=-1.28+j*.84
    for i in range(6):box('movable-type',(-2.35+i*.64,y,.48),(.58,.72,.38),.02)
    letters(word,(-.75,y-.15,.69),.4);still()
motion('composing-stop');box('adjustable-stop',(1.29,0,.5),(.25,3.5,.55),.04)
cyl('locking-screw',(1.29,1.2,.9),.13,.4);ring('knurled-nut',(1.29,1.2,1.12),.3,.12,.12,24);still()

# Authentication: a cutaway padlock, with a key, pin line and a releasing shackle.
module('document-authentication','Cutaway pin-tumbler padlock','document','authentication',(0,0,1.8),(0,0,0))
box('lock-body',(0,-.25,1.3),(3.4,.7,2.5),.3)
for x in [-1.5,1.5]:box('lock-cheek',(x,.2,1.3),(.3,.65,2.3),.12)
box('lock-foot',(0,.2,.2),(3.3,.9,.3),.12)
cyl('plug-shell',(0,.4,.9),.43,3,'X')
motion('plug',(0,.4,.9),(1,0,0));cyl('key-plug',(0,.4,.9),.31,3.2,'X');box('keyway',(-1.65,.4,.9),(.03,.13,.38),.02);still()
for i in range(5):
    x=-1.1+i*.5
    motion('pin-'+str(i));cyl('key-pin',(x,.4,1.29),.1,.6)
    cyl('pin-seat',(x,.4,1.59),.13,.05)
    for j in range(6):ring('pin-spring',(x,.4,1.62+j*.08),.14,.1,.03,16)
    still()
motion('key',(0,.4,.9),(1,0,0));box('key-blade',(-3.2,.4,.9),(2.8,.13,.15),.02)
for i,h in enumerate([.13,.25,.17,.3,.19]):box('key-tooth',(-3.9+i*.5,.4,.99+h/2),(.13,.13,h),.015)
start=len(modules[current]['objects']);ring('key-bow',(-5.25,.4,.9),.65,.44,.13,40);rotate_recent(start,(-5.25,.4,.9),'X',math.pi/2);still()
motion('shackle')
for x in [-1,1]:cyl('shackle-leg',(x,0,2.5 if x<0 else 3.1),.19,2.6 if x<0 else 1.4)
# A real swept semicircle connects both legs.
curve=bpy.data.curves.new('Bent steel shackle','CURVE');curve.dimensions='3D';curve.bevel_depth=.19;curve.bevel_resolution=2
sp=curve.splines.new('POLY');sp.points.add(32)
for i,pt in enumerate(sp.points):
    a=i*math.pi/32;pt.co=(math.cos(a),0,3.8+math.sin(a),1)
obj=bpy.data.objects.new('shackle-arch',curve);scene.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');own(bpy.context.object,'shackle-arch');bpy.context.object.select_set(False);still()

# Foundation: a recognizable type cabinet. Drawers move only on their runners.
module('document-structure','Printers type cabinet','document','structure',(0,0,2),(0,0,0))
for x in [-2,2]:
    box('cabinet-side',(x,0,2),(.25,2.9,3.8),.06)
    for y in [-1.1,1.1]:box('cabinet-foot',(x,y,-.2),(.3,.4,.7),.05)
box('cabinet-top',(0,0,4),(4.4,3.1,.22),.08)
box('cabinet-back',(0,-1.4,2),(4,.15,3.8),.04)
for j in range(4):
    z=.6+j*.85
    for x in [-1.8,1.8]:box('drawer-runner',(x,0,z),(.12,2.7,.14),.02)
    motion('drawer-'+str(j))
    box('drawer-tray',(0,0,z),(3.8,2.6,.1),.04)
    box('drawer-front',(0,1.32,z+.25),(3.9,.18,.58),.04)
    for x in [-.5,.5]:cyl('handle-stud',(x,1.5,z+.3),.07,.22,'Y')
    cyl('drawer-handle',(0,1.63,z+.3),.08,1.12,'X')
    for x in [-1.4,-.7,0,.7,1.4]:box('type-divider',(x,0,z+.25),(.04,2.5,.4),.01)
    for y in [-.8,0,.8]:box('type-divider',(0,y,z+.25),(3.7,.04,.4),.01)
    still()
# Export actual 3D geometry, batched by rigid mechanism; SVGs are still-only posters.
import array
OUT=ROOT/'public/models';PARTS=OUT/'parts';POSTERS=OUT/'posters'
for path in [OUT,PARTS,POSTERS]:path.mkdir(parents=True,exist_ok=True)
bpy.ops.object.camera_add(location=(15,20,15));camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,2.1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=12;scene.camera=camera
bpy.context.view_layer.update();V=(camera.location-Vector((0,0,2.1))).normalized()
W,H=1200,980

def project(p):
    q=world_to_camera_view(scene,camera,p);return [q.x*W,(1-q.y)*H]
def convert(v):return [v[0],v[2],-v[1]]
def path(points):return 'M'+'L'.join(f'{p[0]:.2f} {p[1]:.2f}' for p in points)+'Z'
STYLE='<style>.f0{fill:#20211b}.f1{fill:#191a16}.f2{fill:#131410}.edge{fill:none;stroke:#c9c3ad;stroke-width:.85;stroke-linejoin:round;stroke-linecap:round}</style>'
def svg(shapes,view=f'0 0 {W} {H}'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">{STYLE}'+''.join(s for _,s in sorted(shapes,key=lambda s:s[0]))+'</svg>'

metadata=[];posters={};all_shapes={}
for key,entry in modules.items():
    shapes=[];bounds=[];batches={}
    for obj in entry['objects']:
        mat=obj.matrix_world;mesh=obj.data;verts=[mat@v.co for v in mesh.vertices]
        normalmat=mat.to_3x3();projected=[project(v) for v in verts];bounds.extend(projected)
        group=obj.get('motion_group','body');motion_data=entry['motions'].get(group,dict(pivot=[0,0,0],axis=[0,0,1]));pivot=Vector(motion_data['pivot'])
        batch=batches.setdefault(group,dict(vertices=[],faces=[],edges=[],pivot=convert(pivot),axis=convert(motion_data['axis'])))
        offset=len(batch['vertices']);batch['vertices'].extend(convert(v-pivot) for v in verts)
        batch['faces'].extend(tuple(offset+j for j in face.vertices) for face in mesh.polygons)
        visible={};faces={0:[],1:[],2:[]};edge_paths=[];edges={}
        for poly in mesh.polygons:
            n=(normalmat@poly.normal).normalized();visible[poly.index]=n.dot(V)>.015
            if visible[poly.index]:
                shade=0 if n.z>.75 else 1 if n.dot(Vector((-.6,-.4,.7)))>.35 else 2
                faces[shade].append(path([projected[j] for j in poly.vertices]))
            for edge in poly.edge_keys:edges.setdefault(tuple(sorted(edge)),[]).append(poly.index)
        for (a,b),polys in edges.items():
            normals=[(normalmat@mesh.polygons[p].normal).normalized() for p in polys]
            silhouette=len(polys)==1 or any(visible.get(p)!=visible.get(polys[0]) for p in polys)
            crease=len(normals)==2 and normals[0].dot(normals[1])<.92
            if not silhouette and not crease:continue
            batch['edges'].extend(convert(verts[a]-pivot));batch['edges'].extend(convert(verts[b]-pivot))
            if any(visible.get(p) for p in polys):
                pa,pb=projected[a],projected[b];edge_paths.append(f'M{pa[0]:.2f} {pa[1]:.2f}L{pb[0]:.2f} {pb[1]:.2f}')
        markup=''.join(f'<path d="{"".join(ps)}" class="f{shade}"/>' for shade,ps in faces.items() if ps)+f'<path d="{"".join(edge_paths)}" class="edge"/>'
        if group!='impression':shapes.append((sum(verts,Vector()).dot(V)/len(verts),markup))
    all_shapes[key]=shapes;(PARTS/f'{key}.svg').write_text(svg(shapes))
    # Standard GLB scene: one merged surface mesh per independently moving body.
    bpy.ops.object.select_all(action='DESELECT');temporary=[]
    root=bpy.data.objects.new(key,None);scene.collection.objects.link(root);temporary.append(root);root.select_set(True)
    edge_values=array.array('f');groups=[]
    for name,batch in batches.items():
        node=bpy.data.objects.new(name,None);scene.collection.objects.link(node);node.parent=root;node.location=batch['pivot'];node['mechanism']=name;node['rest']=batch['pivot'];node['axis']=batch['axis'];node.select_set(True);temporary.append(node)
        mesh=bpy.data.meshes.new(name+'-batched');mesh.from_pydata(batch['vertices'],[],batch['faces']);mesh.update()
        surface=bpy.data.objects.new(name+'-surface',mesh);scene.collection.objects.link(surface);surface.parent=node;surface.select_set(True);temporary.append(surface)
        start=len(edge_values)*4;edge_values.extend(batch['edges'])
        groups.append(dict(key=name,pivot=batch['pivot'],axis=batch['axis'],edgeOffset=start,edgeCount=len(batch['edges'])//3))
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{key}.glb'),export_format='GLB',use_selection=True,export_yup=False,export_extras=True,export_materials='NONE')
    with (OUT/f'{key}.edges.bin').open('wb') as f:edge_values.tofile(f)
    for obj in reversed(temporary):
        data=obj.data;bpy.data.objects.remove(obj,do_unlink=True)
        if isinstance(data,bpy.types.Mesh) and data.users==0:bpy.data.meshes.remove(data)
    xs,ys=zip(*bounds)
    metadata.append(dict(id=key,label=entry['label'],category=entry['category'],variant=entry['variant'],offset=convert(entry['offset']),bounds=[min(xs),min(ys),max(xs),max(ys)],objects=len(entry['objects']),asset=f'/models/parts/{key}.svg',model=f'/models/{key}.glb',edges=f'/models/{key}.edges.bin',groups=groups))

scene_parts={'stack':['chassis','backplane','runtime-cloudflare','database-pg-hyperdrive','email-cloudflare','payment-stripe'],'configuration':['document-configuration'],'authentication':['document-authentication'],'structure':['document-structure']}
scene_parts['deployment']=scene_parts['stack']
for name,ids in scene_parts.items():
    selected=[p for p in metadata if p['id'] in ids];bb=[min(p['bounds'][0] for p in selected)-35,min(p['bounds'][1] for p in selected)-35,max(p['bounds'][2] for p in selected)+35,max(p['bounds'][3] for p in selected)+35]
    view=f'{bb[0]} {bb[1]} {bb[2]-bb[0]} {bb[3]-bb[1]}'
    (POSTERS/f'{name}.svg').write_text(svg([s for key in ids for s in all_shapes[key]],view))
    posters[name]=f'/models/posters/{name}.svg'
(ROOT/'src/data/machine.json').write_text(json.dumps(dict(generator='Blender '+bpy.app.version_string,width=W,height=H,modules=metadata,posters=posters),separators=(',',':')))
# The editable source contains the actual mechanism and all alternate fittings.
defaults=set(scene_parts['stack'])
for key,entry in modules.items():
    entry['collection'].hide_viewport=key not in defaults;entry['collection'].hide_render=key not in defaults
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mystack-assembly.blend'),compress=True)
expected_parts={p['id']+'.svg' for p in metadata}
for old in PARTS.glob('*.svg'):
    if old.name not in expected_parts:old.unlink()
for extension in ['*.glb','*.edges.bin']:
    for old in OUT.glob(extension):
        if not any(old.name in [p['id']+'.glb',p['id']+'.edges.bin'] for p in metadata):old.unlink()
print(f'Exported {len(metadata)} physical assemblies, {sum(p["objects"] for p in metadata)} meshes, {sum(len(p["groups"]) for p in metadata)} rigid batches.')
