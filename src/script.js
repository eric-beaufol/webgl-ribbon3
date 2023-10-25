import './style.css'
import * as THREE from 'three'
import * as dat from 'lil-gui'
import Stats from 'stats.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Base
 */

// Constants
const MOUSE = new THREE.Vector2()
const MOUSE_POSITIONS = []
const MAX_MOUSE_POS_LENGTH = 100000
const MAX_PROPAGATION_TIME = 1000

// Debug
const params = {
  roughness: 0.57,
  metalness: .1,
  ribbonsLength: 20,
  ribbonsMaxWidth: .5
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


/**
 * Camera
 */
// Base camera
const { width, height } = sizes
const camera = new THREE.PerspectiveCamera(75, width / height, .1, 100)
camera.position.set(0, -0.25, 1.5)
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
renderer.setClearColor(0xffffff, 1)
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
  directionalLight.shadow.camera.far = 15
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

const addHelper = () => {
  scene.add(
    new THREE.GridHelper()
  )
}

let ribbon2
const addRibon1 = () => {
  ribbon2 = new THREE.Mesh(
    new THREE.PlaneGeometry(.1, 1, 1, MAX_MOUSE_POS_LENGTH - 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
  )

  ribbon2.rotation.x = Math.PI / 2

  scene.add(ribbon2)
}

let ribbon, curveObject

const addRibbon = () => {
  const pointsLen = 20
  const pointsArr = []
  
  // add point around a sphere of radius 1
  for (let i = 0; i < pointsLen; i++) {

    pointsArr.push(
      new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      )
    )
  }

  //Create a closed wavey loop
  const curve = new THREE.CatmullRomCurve3(pointsArr, true, 'catmullrom')

  const points = curve.getPoints(550)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const color = Math.random() * 0xff0000
  const material = new THREE.LineBasicMaterial({ color })

  // Create the final object to add to the scene
  curveObject = new THREE.Line(geometry, material)
  // scene.add(curveObject)

  const ribbonWidth = Math.random() * 0.04 * params.ribbonsMaxWidth
  const number = 2000
  const frenetFrames = curve.computeFrenetFrames(number, true)
  const spacedPoints = curve.getSpacedPoints(number)
  const distances = [-ribbonWidth, ribbonWidth]
  const finalPoints = []
  const alphaMapTexture = new THREE.TextureLoader().load('/ribbon-alphamap.png')
  alphaMapTexture.wrapS = alphaMapTexture.wrapT = THREE.RepeatWrapping

  ribbon = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1, number),
    new THREE.MeshStandardMaterial({ 
      color, 
      side: THREE.DoubleSide,
      roughness: params.roughness,
      metalness: params.metalness,
      alphaMap: alphaMapTexture,
      alphaTest: .5,
      // wireframe: true
    })
  )

  distances.forEach(dist => {
    let firstPointClone

    for (let i = 0; i < number; i++) {
      const point = new THREE.Vector3().copy(spacedPoints[i])
      const binormal = new THREE.Vector3().copy(frenetFrames.binormals[i])
      point.add(binormal.multiplyScalar(dist))
      finalPoints.push(point)

      if (i === 0) {
        firstPointClone = point.clone()
      }
    }

    finalPoints.push(firstPointClone)
  })

  ribbon.geometry.setFromPoints(finalPoints)
  ribbon.geometry.computeVertexNormals()
  ribbon.castShadow = true
  ribbon.speed = Math.random() * 0.9 + 0.1
  // ribbon.receiveShadow = true

  scene.add(ribbon)
  
  params.reset = () => {
    scene.remove(ribbon)
    addRibbon()
  }
}

const updateRibbon = () => {
  // console.log(ribbon2.geometry.attributes)

  const position = ribbon2.geometry.attributes.position.array

  for (let i = 0; i < position.length; i+= 3) {
    const index = Math.floor(i / (3 * 2))

    if (MOUSE_POSITIONS[index]) {
      position[i + 0] = MOUSE_POSITIONS[index].x // x
      position[i + 1] = MOUSE_POSITIONS[index].y // y
      // const z = position[i + 2]
    }
  }

  ribbon2.geometry.attributes.position.needsUpdate = true
}

const addPlane = () => {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
      // color: 0xd7fdd2,
      color: 0xffffff,
      // emissive: 0xffffff,
      wireframe: false,
      side: THREE.DoubleSide
    })
  )

  mesh.rotateX(Math.PI / 2)
  mesh.position.y = -.7
  mesh.receiveShadow = true

  scene.add(mesh)
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
}

const addEvents = () => {
  window.addEventListener('mousemove', e => {
    const vec = new THREE.Vector3() // create once and reuse
    const pos = new THREE.Vector3() // create once and reuse

    vec.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      - (e.clientY / window.innerHeight) * 2 + 1,
      0.5
    )

    vec.unproject(camera)
    vec.sub(camera.position).normalize()

    const distance = - (1 - camera.position.z) / vec.z

    pos.copy(camera.position).add(vec.multiplyScalar(distance))

    // MOUSE.x = e.clientX - sizes.width / 2
    // MOUSE.y = - e.clientY + sizes.height / 2

    MOUSE_POSITIONS.push(pos)

    console.log(pos)

    if (MOUSE_POSITIONS.length > MAX_MOUSE_POS_LENGTH) {
      MOUSE_POSITIONS.shift()
    }
  })
}

const tick = () => {
  stats.begin()

  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - previousTime
  previousTime = elapsedTime

  // Update controls
  controls.update(elapsedTime)

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
// addRibbon()
addRibon1()
addPlane()
addLights()
addGUI()
tick()
