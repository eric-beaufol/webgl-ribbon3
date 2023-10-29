import './style.css'
import * as THREE from 'three'
import * as dat from 'lil-gui'
import Stats from 'stats.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Base
 */

// Constants
const MOUSE = new THREE.Vector3()
const MAX_MOUSE_POS_LENGTH = 50
const MOUSE_POSITIONS = new Array(MAX_MOUSE_POS_LENGTH).fill(new THREE.Vector3())

// Debug
const params = {
  roughness: 0.57,
  metalness: .1,
  ribbonHeight: 7,
  ribbonMaxWidth: .5,
  anchorPointZ: -5 
}

// Stats
const stats = new Stats()
document.body.appendChild(stats.dom)

// canvas
const canvas = document.querySelector('canvas.webgl')

// Scenes
const scene = new THREE.Scene()

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

/**
 * Render target
 */

window.THREE = THREE


/**
 * Camera
 */
// Base camera
const { width, height } = sizes
const camera = new THREE.PerspectiveCamera(75, width / height, .1, 100)
camera.position.set(0, 1.5, 2.5)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0)
controls.enableDamping = true
controls.autoRotateSpeed = 0.5
// controls.autoRotate = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})
// renderer.setClearColor(0xffffff, 1)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.shadowMap.type = THREE.VSMShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

function onResize() {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

window.addEventListener('resize', onResize)

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const lights = []
const addLights = () => {
  const ambientLight = new THREE.AmbientLight(0xffffff, .6)
  scene.add(ambientLight)

  const lightShadowMapSize = 3
  const directionalLight = new THREE.DirectionalLight(0xffffff, .7)
  directionalLight.position.set(1, 2, 4)
  directionalLight.castShadow = true
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  directionalLight.shadow.camera.near = 0.1
  directionalLight.shadow.camera.far = 150
  directionalLight.shadow.camera.top = lightShadowMapSize
  directionalLight.shadow.camera.bottom = -lightShadowMapSize
  directionalLight.shadow.camera.left = -lightShadowMapSize
  directionalLight.shadow.camera.right = lightShadowMapSize
  directionalLight.shadow.bias = -0.001;

  scene.add(directionalLight)

  const directionalLight1 = directionalLight.clone()
  directionalLight1.intensity = 0.2
  directionalLight1.position.x = -2
  scene.add(directionalLight1)

  const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 1, 0x00ff00)
  // scene.add(lightHelper)

  const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
  // scene.add(shadowHelper)

  lights.push(directionalLight, directionalLight1)
}

let vHelper1, vHelper2
const addHelper = () => {
  if (!vHelper1) {
    vHelper1 = new THREE.GridHelper(30, 30, 0xff0000)
    vHelper1.rotation.x = Math.PI / 2
    scene.add(vHelper1)
  }

  vHelper1.position.z = params.anchorPointZ

  if (!vHelper2) {
    vHelper2 = new THREE.GridHelper(10, 10, 0x00ff00)
    vHelper2.rotation.x = Math.PI / 2
    vHelper2.position.z = 0
    vHelper2.color = 0x00ffff
    scene.add(vHelper2)
  }
}

let ribbon
const addRibbon = () => {
  if (ribbon) {
    scene.remove(ribbon)
  }

  const { ribbonHeight } = params

  ribbon = new THREE.Mesh(
    new THREE.PlaneGeometry(.1, ribbonHeight, 1, MAX_MOUSE_POS_LENGTH - 1),
    // new THREE.CylinderGeometry(.03, .03, 30, 7, MAX_MOUSE_POS_LENGTH - 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide })
  )
  
  const ribbonZ = -ribbonHeight/2 - params.anchorPointZ
  ribbon.geometry.translate(0, ribbonZ, 0)
  ribbon.rotation.x = -Math.PI / 2 

  scene.add(ribbon)
}

const updateRibbon = () => {
  const position = ribbon.geometry.attributes.position.array

  for (let i = 0; i < position.length; i += 3) {
    const index = (MAX_MOUSE_POS_LENGTH - 1) - Math.floor(i / 3 / 2)

    if (MOUSE_POSITIONS[index]) {
      position[i + 0] = MOUSE_POSITIONS[index].x
      position[i + 2] = MOUSE_POSITIONS[index].y
      position[i + 0] += i % 2 ? .2 : -0.2
    }
  }

  ribbon.geometry.attributes.position.needsUpdate = true
}

let box
const addBox = () => {
  box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  )
  box.position.z = params.anchorPointZ
  scene.add(box)
}

let gui
const addGUI = () => {
  gui = new dat.GUI()

  gui.add(params, 'roughness', 0, 1, .001)
  gui.add(params, 'metalness', 0, 1, .001)
  // gui.add(params, 'ribbonsLength', 1, 500, 1).onChange(addRibbons)
  // gui.add(params, 'ribbonsMaxWidth',  0.05, 1, .001).onChange(addRibbons)
  // gui.add(params, 'reset')
  gui.add(controls, 'autoRotate')
  gui.add(params, 'ribbonHeight', 7, 60).onChange(addRibbon)
  gui.add(params, 'anchorPointZ', -40, -5).onChange(() => {
    addRibbon()
    addHelper()
    box.position.z = params.anchorPointZ
  })
}

const onMouseMove = e => {
  // return
  const vec = new THREE.Vector3() // create once and reuse
  const pos = new THREE.Vector3() // create once and reuse

  vec.set(
    (e.clientX / window.innerWidth) * 2 - 1,
    - (e.clientY / window.innerHeight) * 2 + 1,
    0.5
  )

  vec.unproject(camera)
  vec.sub(camera.position).normalize()
  pos.copy(camera.position).add(vec)

  // Method #1 (failed)
  const offsetCamToVec = pos.clone().sub(camera.position)
  const offsetAnchorPointZ = params.anchorPointZ - camera.position.z
  const ratio = offsetAnchorPointZ / offsetCamToVec.z
  const offsetX = offsetCamToVec.x * ratio
  const offsetY = offsetCamToVec.y * ratio
  const x = camera.position.x + offsetX
  const y = camera.position.y + offsetY
  const position = new THREE.Vector3(x, y, params.anchorPointZ)

  pos.copy(position)
  MOUSE.copy(pos)
  box.position.copy(pos)
}

const addEvents = () => {
  window.addEventListener('mousemove', onMouseMove)
}

const tick = () => {
  stats.begin()

  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - previousTime
  previousTime = elapsedTime

  // Update controls
  controls.update(elapsedTime)

  MOUSE_POSITIONS.push(MOUSE.clone())

  if (MOUSE_POSITIONS.length > MAX_MOUSE_POS_LENGTH) {
    MOUSE_POSITIONS.shift()
  }

  // Ribbon
  // ribbons.forEach(ribbon => {
  //   ribbon.material.roughness = params.roughness
  //   ribbon.material.metalness = params.metalness
  // })

  updateRibbon()

  renderer.render(scene, camera)

  stats.end()

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

addEvents()
addRibbon()
addBox()
addLights()
addGUI()
addHelper()
tick()
