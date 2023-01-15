Shader "Custom/Sigil"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1,1,1,1)
        _NoiseScale ("Noise Scale", float) = 16.0
        _TimeScale ("Time Scale", float) = 0.25
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
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                UNITY_FOG_COORDS(1)
                float4 vertex : SV_POSITION;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            fixed4 _Color;
            float _NoiseScale;
            float _TimeScale;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                UNITY_TRANSFER_FOG(o,o.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                // sample the texture
                fixed4 baseColor = tex2D(_MainTex, i.uv);
                float noiseScale = _NoiseScale;
                float timeScale = _TimeScale;
                fixed4 noiseColor = (SimplexNoise(float3(i.uv.x * noiseScale, i.uv.y * noiseScale, _Time.y * timeScale)) + 1) * 0.5;
                fixed4 overColor = _Color;
                fixed4 col = baseColor;
                col.rgb = col.rgb * 0.25 + 0.75 * (col.rgb / noiseColor.rgb);
                col.rgb = max(0, (col.rgb + overColor.rgb) - 1);
                col.a = baseColor.r;

                // apply fog
                UNITY_APPLY_FOG(i.fogCoord, col);

                return col;
            }
            ENDCG
        }
    }
}
