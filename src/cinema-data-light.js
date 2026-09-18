import * as T from 'three';

// One linear-light colour and compositing rule for the LCD, the emitted
// stream and the passage. Additive cores over a bright LCD used to clip white.
export const DATA_LIGHT=Object.freeze({color:0xc2e5ce,bloom:.12});

export function createDataLightMaterial(){
 return new T.ShaderMaterial({
  transparent:true,depthWrite:false,depthTest:true,toneMapped:false,blending:T.NormalBlending,
  uniforms:{color:{value:new T.Color(DATA_LIGHT.color)},opacity:{value:1}},
  vertexShader:'attribute float aStripOpacity;varying float vStripOpacity;void main(){vStripOpacity=aStripOpacity;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 color;uniform float opacity;varying float vStripOpacity;void main(){gl_FragColor=vec4(color,vStripOpacity*opacity);}'
 });
}
