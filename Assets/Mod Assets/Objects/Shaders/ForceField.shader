Shader "Custom/ForceField"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" }
        LOD 100

        ZWrite Off
        Blend SrcAlpha OneMinusSrcAlpha

        Pass
        {
            CGPROGRAM
            #include "Packages/jp.keijiro.noiseshader/Shader/SimplexNoise3D.hlsl"

            #pragma vertex vert
            #pragma fragment frag
            // make fog work
            #pragma multi_compile_fog

            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float3 uv : TEXCOORD0;
                fixed4 color : COLOR;
            };

            struct v2f
            {
                float3 uv : TEXCOORD0;
                UNITY_FOG_COORDS(1)
                float4 vertex : SV_POSITION;
                fixed4 color : COLOR;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            float4 _Color;

            v2f vert (appdata v)
            {
                v2f o;
                float4 vert = v.vertex;
                float3 noiseScale = float3(0.5, 0.2, 0.5);
                float3 noise = SimplexNoise(vert * noiseScale);
                float timeFactor = (0.5 + v.uv.z * 0.5);
                float distortScale = 0.5;
                vert.x += noise.x * timeFactor * distortScale;
                vert.y += noise.y * timeFactor * distortScale;
                vert.z += noise.z * timeFactor * distortScale;
                o.vertex = UnityObjectToClipPos(vert);
                o.uv.xy = TRANSFORM_TEX(v.uv.xy, _MainTex);
                o.uv.z = v.uv.z;
                o.color = v.color;
                UNITY_TRANSFER_FOG(o,o.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // sample the texture
                fixed4 col = tex2D(_MainTex, i.uv);
                col *= _Color;
                col *= i.color;
                col.rgb += col.rgb;
                // apply fog
                UNITY_APPLY_FOG(i.fogCoord, col);
                return col;
            }
            ENDCG
        }
    }
}
