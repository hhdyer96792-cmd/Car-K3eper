import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Обрабатываем preflight (OPTIONS)
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

                                                          // Только POST
                                                            if (req.method !== "POST") {
                                                                return new Response("Method not allowed", { status: 405 });
                                                                  }

                                                                    const { userId, newPassword } = await req.json();
                                                                      if (!userId || !newPassword) {
                                                                          return new Response("Missing fields", { status: 400 });
                                                                            }

                                                                              const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
                                                                                if (error) {
                                                                                    return new Response(error.message, {
                                                                                          status: 500,
                                                                                                headers: { "Access-Control-Allow-Origin": "*" },
                                                                                                    });
                                                                                                      }

                                                                                                        return new Response(JSON.stringify({ success: true }), {
                                                                                                            status: 200,
                                                                                                                headers: {
                                                                                                                      "Content-Type": "application/json",
                                                                                                                            "Access-Control-Allow-Origin": "*",
                                                                                                                                },
                                                                                                                                  });
                                                                                                                                  });