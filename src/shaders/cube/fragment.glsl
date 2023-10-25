#define PI 3.1415926535897932384626433832795

uniform sampler2D uImg1Texture;
uniform sampler2D uImg2Texture;
uniform vec2 uPosition;
uniform vec2 uSize;

varying vec2 vUv;

void main() {
  vec2 uv = vec2(vUv * uSize) + uPosition;
  vec4 color = texture2D(uImg1Texture, uv);

  gl_FragColor = color;
}