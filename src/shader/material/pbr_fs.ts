import { wgslParseDefines } from "../WgslPreprocessor";
export default function pbr_fs(defines) {
	return wgslParseDefines`
        // reference: https://github.com/KhronosGroup/glTF-WebGL-PBR/blob/master/shaders/pbr-frag.glsl
        #include <pbrUtils>
        #include <light>
        #include <brdf>
        struct MaterialUniform {
            modelMatrix: mat4x4<f32>,
            color: vec3<f32>,
            opacity:f32,
            normalMatrix: mat4x4<f32>,
            emissive:vec3<f32>,
            metallic:f32,
            roughness:f32,
            #if ${defines.USE_NORMALTEXTURE}
                normalTextureScale:vec2<f32>,
            #endif
            #if ${defines.USE_AOTEXTURE}
                occlusionStrength:f32,
            #endif
         }
         struct SystemUniform {
            projectionMatrix: mat4x4<f32>,
            viewMatrix: mat4x4<f32>,
            inverseViewMatrix: mat4x4<f32>,
            cameraPosition: vec3<f32>,
        }; 
        struct VertInput {
            @builtin(front_facing) frontFacing: bool,
            @location(0) worldPos:vec3<f32>,
            @location(1) normal:vec3<f32>,
            @location(2) uv:vec2<f32>
        }    
        struct PhysicalMaterial {
            diffuseColor:vec3<f32>,
            roughness:f32,
            specularColor:vec3<f32>,
           #if ${defines.USE_CLEARCOAT}
               clearcoat:f32,
               clearcoatRoughness:f32,
               clearcoatF0:vec3<f32>,
               clearcoatF90:f32,
           #endif

           #if ${defines.USE_IRIDESCENCE}
               iridescence:f32,
               iridescenceIOR:f32,
               iridescenceThickness:f32,
               iridescenceFresnel:vec3<f32>,
               iridescenceF0:vec3<f32>,
           #endif

           #if ${defines.USE_SHEEN}
               sheenColor:vec3<f32>,
               sheenRoughness:f32,
           #endif

           #if ${defines.IOR}
                ior:f32,
           #endif

           #if ${defines.USE_TRANSMISSION}
               transmission:f32,
               transmissionAlpha:f32,
               thickness:f32,
               attenuationDistance:f32,
               attenuationColor:vec3<f32>,
           #endif
       };
        const M_PI:f32 = 3.141592653589793;
        const c_MinRoughness:f32 = 0.04;
        @binding(0) @group(0) var<uniform> materialUniform : MaterialUniform;
        @binding(0) @group(1) var<uniform> systemUniform : SystemUniform;
        // IBL
        @group(0) @binding(${defines.specularEnvTextureBinding}) var specularEnvTexture: texture_cube<f32>;
        @group(0) @binding(${defines.specularEnvSamplerBinding}) var specularEnvSampler: sampler;
        #if ${defines.USE_TEXTURE}
           @group(0) @binding(${defines.baseColorTextureBinding}) var baseColorTexture: texture_2d<f32>;
           @group(0) @binding(${defines.baseColorSamplerBinding}) var baseColorSampler: sampler;
        #endif
        // normal map
        #if ${defines.USE_NORMALTEXTURE}
          @group(0) @binding(${defines.normalTextureBinding}) var normalTexture: texture_2d<f32>;
          @group(0) @binding(${defines.normalSamplerBinding}) var normalSampler: sampler;
        #endif
        // emmisve map
        #if ${defines.USE_EMISSIVETEXTURE}
            @group(0) @binding(${defines.emissiveTextureBinding}) var emissiveTexture: texture_2d<f32>;
            @group(0) @binding(${defines.emissiveSamplerBinding}) var emissiveSampler: sampler;
        #endif

        // metal roughness
        #if ${defines.USE_METALNESSTEXTURE}
             @group(0) @binding(${defines.metalnessRoughnessTextureBinding}) var metalnessRoughnessTexture: texture_2d<f32>;
             @group(0) @binding(${defines.metalnessRoughnessSamplerBinding}) var metalnessRoughnessSampler: sampler;
        #endif
        // occlusion texture
        #if ${defines.USE_AOTEXTURE}
             @group(0) @binding(${defines.aoTextureBinding}) var aoTexture: texture_2d<f32>;
             @group(0) @binding(${defines.aoSamplerBinding}) var aoSampler: sampler;
        #endif
        #if ${defines.USE_NORMALTEXTURE}
            #include <getTBN>
            #include <getNormalByNormalTexture>
        #else
            #include <getNormal>
        #endif
        #include <ibl>
        @fragment
        fn main(input:VertInput) -> @location(0) vec4<f32> 
        {
            var perceptualRoughness:f32 = materialUniform.roughness;
            var metallic:f32 = materialUniform.metallic;

        #if ${defines.USE_METALNESSTEXTURE}
            let mrSample:vec4<f32> = textureSample(metalnessRoughnessTexture,metalnessRoughnessSampler, input.uv);
            perceptualRoughness = mrSample.g * perceptualRoughness;
            metallic = mrSample.b * metallic;
        #endif
            perceptualRoughness = clamp(perceptualRoughness, c_MinRoughness, 1.0);
            metallic = clamp(metallic, 0.0, 1.0);
            let alphaRoughness:f32 = perceptualRoughness * perceptualRoughness;


            // The albedo may be defined from a base texture or a flat color
            #if ${defines.USE_TEXTURE}
                let baseColor:vec4<f32> = textureSample(baseColorTexture,baseColorSampler, input.uv) ;
            #else
                let baseColor:vec4<f32> = vec4<f32>(materialUniform.color,1.0);
            #endif

            #if ${defines.USE_NORMALTEXTURE}
                let n:vec3<f32> = getNormalByNormalTexture(input);  
            #else
                let n:vec3<f32> = getNormal(input);
            #endif
            var material:PhysicalMaterial;
            material.diffuseColor=baseColor.rgb*( 1.0 - metallic );
            material.roughness=perceptualRoughness;
            material.specularColor=mix( vec3<f32>( 0.04), baseColor.rgb, metallic );
            var geometry:Geometry;
            geometry.normal=n;
            geometry.viewDir=normalize(systemUniform.cameraPosition - input.worldPos);
            geometry.position=input.worldPos;
            geometry.dotNV = saturate(dot(geometry.normal, geometry.viewDir) );

            var reflectedLight=parseLights(geometry,material);
            var color=reflectedLight.directDiffuse+reflectedLight.directSpecular;
            // USE_IBL
            var reflectedLightDiffuse=indirectDiffuse_Physical(geometry,material);
            var reflectedLightSpecular=indirectSpecular_Physical(geometry,material);
            color+=reflectedLightDiffuse.indirectDiffuse;
            color+=reflectedLightSpecular.indirectSpecular;
        // Apply optional PBR terms for additional (optional) shading
        #if ${defines.USE_AOTEXTURE}
            let ao:f32 = textureSample(aoTexture,aoSampler, input.uv).r;
            color = mix(color, color * ao, materialUniform.occlusionStrength);
        #endif

        #if ${defines.USE_EMISSIVETEXTURE}
            let emissive:vec3<f32> = textureSample(emissiveTexture, emissiveSampler,input.uv).rgb ;
            color += emissive;
        #endif
       return vec4<f32>(color, baseColor.a);
    }
   `;
}
