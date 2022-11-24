export default function lightCommon(defines){
 return  `
    struct ReflectedLight {
        directDiffuse:vec3<f32>,
        directSpecular:vec3<f32>,
        indirectDiffuse:vec3<f32>,
        indirectSpecular:vec3<f32>,
    };
    struct IncidentLight {
        color: vec3<f32>,
        direction: vec3<f32>,
        visible: bool,
    };
    struct GeometricContext {
        position: vec3<f32>,
        normal: vec3<f32>,
        viewDir: vec3<f32>,
    };
 `
}