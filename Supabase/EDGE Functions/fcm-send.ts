import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Отправка FCM-сообщения ---
async function sendFCM(token, title, body) {
  const accessToken = await getAccessToken();
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/car-k3eper/messages:send`;
      const res = await fetch(fcmUrl, {
          method: "POST",
              headers: {
                    "Authorization": `Bearer ${accessToken}`,
                          "Content-Type": "application/json",
                              },
                                  body: JSON.stringify({
                                        message: {
                                                token: token,
                                                        notification: { title, body },
                                                                webpush: {
                                                                          notification: {
                                                                                      icon: "icon-192.png",
                                                                                                  click_action: "http://localhost:8000/?tab=to", // замените на ваш реальный домен
                                                                                                            },
                                                                                                                    },
                                                                                                                          },
                                                                                                                              }),
                                                                                                                                });
                                                                                                                                  console.log("FCM response:", await res.text());
                                                                                                                                  }

                                                                                                                                  // --- Получение OAuth2-токена ---
                                                                                                                                  async function getAccessToken() {
                                                                                                                                    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "{}";
                                                                                                                                      const SERVICE_ACCOUNT = JSON.parse(raw);
                                                                                                                                        if (!SERVICE_ACCOUNT.client_email) throw new Error("Service account JSON not configured");

                                                                                                                                          const now = Math.floor(Date.now() / 1000);
                                                                                                                                            const header = { alg: "RS256", typ: "JWT" };
                                                                                                                                              const claim = {
                                                                                                                                                  iss: SERVICE_ACCOUNT.client_email,
                                                                                                                                                      scope: "https://www.googleapis.com/auth/firebase.messaging",
                                                                                                                                                          aud: "https://oauth2.googleapis.com/token",
                                                                                                                                                              exp: now + 3600,
                                                                                                                                                                  iat: now,
                                                                                                                                                                    };

                                                                                                                                                                      const encoder = new TextEncoder();
                                                                                                                                                                        const key = await crypto.subtle.importKey(
                                                                                                                                                                            "pkcs8",
                                                                                                                                                                                pemToArrayBuffer(SERVICE_ACCOUNT.private_key),
                                                                                                                                                                                    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                                                                                                                                                                                        false,
                                                                                                                                                                                            ["sign"]
                                                                                                                                                                                              );

                                                                                                                                                                                                const jwt = btoa(JSON.stringify(header)) + "." + btoa(JSON.stringify(claim));
                                                                                                                                                                                                  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(jwt));
                                                                                                                                                                                                    const signedJwt = jwt + "." + b64urlEncode(new Uint8Array(signature));

                                                                                                                                                                                                      const res = await fetch("https://oauth2.googleapis.com/token", {
                                                                                                                                                                                                          method: "POST",
                                                                                                                                                                                                              headers: { "Content-Type": "application/x-www-form-urlencoded" },
                                                                                                                                                                                                                  body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
                                                                                                                                                                                                                    });
                                                                                                                                                                                                                      const data = await res.json();
                                                                                                                                                                                                                        return data.access_token;
                                                                                                                                                                                                                        }

                                                                                                                                                                                                                        function pemToArrayBuffer(pem) {
                                                                                                                                                                                                                          const b64 = pem.replace(/-----.*?-----/g, "").replace(/\s/g, "");
                                                                                                                                                                                                                            const binary = atob(b64);
                                                                                                                                                                                                                              const bytes = new Uint8Array(binary.length);
                                                                                                                                                                                                                                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                                                                                                                                                                                                                  return bytes.buffer;
                                                                                                                                                                                                                                  }

                                                                                                                                                                                                                                  function b64urlEncode(buffer) {
                                                                                                                                                                                                                                    return btoa(String.fromCharCode(...buffer))
                                                                                                                                                                                                                                        .replace(/\+/g, "-")
                                                                                                                                                                                                                                            .replace(/\//g, "_")
                                                                                                                                                                                                                                                .replace(/=+$/, "");
                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                // --- Обработчик запроса ---
                                                                                                                                                                                                                                                serve(async (req) => {
                                                                                                                                                                                                                                                  // Preflight CORS
                                                                                                                                                                                                                                                    if (req.method === "OPTIONS") {
                                                                                                                                                                                                                                                        return new Response(null, {
                                                                                                                                                                                                                                                              status: 204,
                                                                                                                                                                                                                                                                    headers: {
                                                                                                                                                                                                                                                                            "Access-Control-Allow-Origin": "*",
                                                                                                                                                                                                                                                                                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                                                                                                                                                                                                                                                                                            "Access-Control-Allow-Headers": "Content-Type",
                                                                                                                                                                                                                                                                                                  },
                                                                                                                                                                                                                                                                                                      });
                                                                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                                                                          if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

                                                                                                                                                                                                                                                                                                            const { token, title, body } = await req.json();
                                                                                                                                                                                                                                                                                                              if (!token || !title || !body) return new Response("Missing fields", { status: 400 });

                                                                                                                                                                                                                                                                                                                try {
                                                                                                                                                                                                                                                                                                                    await sendFCM(token, title, body);
                                                                                                                                                                                                                                                                                                                        return new Response(JSON.stringify({ success: true }), {
                                                                                                                                                                                                                                                                                                                              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                                                                                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                                                                                    } catch (error) {
                                                                                                                                                                                                                                                                                                                                        return new Response(JSON.stringify({ error: error.message }), {
                                                                                                                                                                                                                                                                                                                                              status: 500,
                                                                                                                                                                                                                                                                                                                                                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                                                                                                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                          });