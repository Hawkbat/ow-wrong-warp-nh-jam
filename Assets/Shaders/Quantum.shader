Shader "Custom/Quantum"
{
    Properties
    {
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200

        CGPROGRAM
        #include "Packages/jp.keijiro.noiseshader/Shader/SimplexNoise3D.hlsl"

        // Physically based Standard lighting model, and enable shadows on all light types
        #pragma surface surf Standard fullforwardshadows

        // Use shader model 3.0 target, to get nicer looking lighting
        #pragma target 3.0

        struct Input
        {
            float2 uv_MainTex;
            float3 worldPos;
        };

        fixed3 mapGradientColor(float n) {
            if (n > 0.9) return fixed3(0.42, 0.63, 0.87);
            if (n > 0.8) return fixed3(0.31, 0.50, 1.00);
            if (n > 0.7) return fixed3(0.35, 0.63, 0.97);
            if (n > 0.6) return fixed3(0.53, 0.54, 0.64);
            if (n > 0.5) return fixed3(0.33, 0.46, 0.80);
            if (n > 0.4) return fixed3(0.22, 0.53, 0.92);
            if (n > 0.3) return fixed3(0.29, 0.48, 0.97);
            if (n > 0.2) return fixed3(0.53, 0.64, 0.99);
            if (n > 0.1) return fixed3(0.42, 0.63, 0.87);
            return fixed3(0.31, 0.50, 1.00);
        }

        fixed3 mapGradient(float3 localPos) {
            float s = abs(SimplexNoise(-(localPos + float3(15, 7, 31)) * 0.2)) * 0.05;
            float3 p = (localPos + float3(31, 15, 7)) * (1 + s) * float3(1, 0.5, 0.2) * 0.25;
            float n = abs((SimplexNoise(p) * 2) % 1.0);
            float o = abs(SimplexNoise(-p) % 1.0);
            float dx = abs(
                SimplexNoise(p + float3(-0.01, 0, 0)) -
                SimplexNoise(p + float3( 0.01, 0, 0))
            ) * 0.5;
            float dy = abs(
                SimplexNoise(p + float3(0, -0.01, 0)) -
                SimplexNoise(p + float3(0, 0.01, 0))
            ) * 0.5;
            float d = dx + dy;
            float r = (n % 0.1) * 10;
            float l = 0.2 + 0.2 * o;
            float b = r < l + d ? (1 - l - d) + r : 1;
            float c = lerp(n, o, 0.5 * o);
            return b * mapGradientColor(c) * mapGradientColor(c);
        }

        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            float3 localPos = IN.worldPos -  mul(unity_ObjectToWorld, float4(0,0,0,1)).xyz;
            o.Albedo = mapGradient(localPos) * float3(0.3939, 0.3857, 0.4265);
            o.Metallic = 1;
            o.Smoothness = 0.5;
            o.Alpha = 1;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
