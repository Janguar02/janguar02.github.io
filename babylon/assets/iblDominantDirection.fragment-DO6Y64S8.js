import{S as i}from"./index-C9WUgdE6.js";import{h as o}from"./helperFunctions-32n8uFoM.js";import{i as t,h as c}from"./hdrFilteringFunctions-C96fK7wm.js";import{p as a}from"./pbrBRDFFunctions-CVwDAAy9.js";const r="iblDominantDirectionPixelShader",n=`precision highp sampler2D;precision highp samplerCube;
#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
varying vec2 vUV;uniform sampler2D icdfSampler;void main(void) {vec3 lightDir=vec3(0.0,0.0,0.0);for(uint i=0u; i<NUM_SAMPLES; ++i)
{vec2 Xi=hammersley(i,NUM_SAMPLES);vec2 T;T.x=texture2D(icdfSampler,vec2(Xi.x,0.0)).x;T.y=texture2D(icdfSampler,vec2(T.x,Xi.y)).y;vec3 Ls=uv_to_normal(vec2(1.0-fract(T.x+0.25),T.y));lightDir+=Ls;}
lightDir/=float(NUM_SAMPLES);gl_FragColor=vec4(lightDir,1.0);}`;i.ShadersStore[r]||(i.ShadersStore[r]=n);const s=[o,t,a,c];for(const e of s)i.IncludesShadersStore[e.name]||(i.IncludesShadersStore[e.name]=e.shader);const S={name:r,shader:n};export{S as iblDominantDirectionPixelShader};
