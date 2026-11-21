import{S as o}from"./index-D7666_0C.js";const e="fogVertex",r=`#ifdef FOG
vFogDistance=(view*worldPos).xyz;
#endif
`;o.IncludesShadersStore[e]||(o.IncludesShadersStore[e]=r);const t={name:e,shader:r};export{t as f};
