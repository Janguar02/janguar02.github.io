import{S as r}from"./index-D7666_0C.js";import{h as o}from"./helperFunctions-425bZ0Te.js";import{i as t,h as a}from"./hdrFilteringFunctions-Dgx3It1z.js";import{p as c}from"./pbrBRDFFunctions-BEESOp-f.js";const i="hdrFilteringPixelShader",n=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
uniform float alphaG;uniform samplerCube inputTexture;uniform vec2 vFilteringInfo;uniform float hdrScale;varying vec3 direction;void main() {vec3 color=radiance(alphaG,inputTexture,direction,vFilteringInfo);gl_FragColor=vec4(color*hdrScale,1.0);}`;r.ShadersStore[i]||(r.ShadersStore[i]=n);const l=[o,t,c,a];for(const e of l)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);const m={name:i,shader:n};export{m as hdrFilteringPixelShader};
