import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  const url = new URL(req.url);
    const token = url.searchParams.get("token");
      if (!token) return new Response("Missing token", { status: 400 });

        const { data: tokenRow, error: tokenError } = await supabase
            .from("calendar_tokens")
                .select("car_id")
                    .eq("token", token)
                        .single();

                          if (tokenError || !tokenRow) return new Response("Invalid token", { status: 403 });

                            const carId = tokenRow.car_id;

                              const { data: operations, error: opsError } = await supabase
                                  .from("operations")
                                      .select("*")
                                          .eq("car_id", carId);

                                            if (opsError) return new Response(opsError.message, { status: 500 });

                                              // Загружаем запчасти для этого автомобиля
                                                const { data: parts } = await supabase
                                                    .from("parts")
                                                        .select("*")
                                                            .eq("car_id", carId);

                                                              let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Vesta Dashboard//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
                                                                const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

                                                                  operations?.forEach(op => {
                                                                      const planDate = calculatePlanDate(op);
                                                                          if (!planDate) return;
                                                                              const dt = planDate.replace(/-/g, "") + "T090000";
                                                                                  const uid = op.id + "-vesta-" + planDate;

                                                                                      // Находим запчасти для этой операции
                                                                                          const relevantParts = (parts || []).filter(p => p.operation === op.name || p.operation === op.category);
                                                                                              let partsList = "";
                                                                                                  if (relevantParts.length > 0) {
                                                                                                        partsList = "\\n\\nСписок запчастей:\\n";
                                                                                                              relevantParts.forEach(p => {
                                                                                                                      const status = (p.in_stock && p.in_stock > 0) ? "✅" : "☐";
                                                                                                                              partsList += `${status} ${p.oem || p.analog || p.operation}${p.price ? ` (${p.price}₽)` : ""}\\n`;
                                                                                                                                    });
                                                                                                                                        }

                                                                                                                                            ics += "BEGIN:VEVENT\r\n";
                                                                                                                                                ics += `UID:${uid}\r\n`;
                                                                                                                                                    ics += `DTSTART:${dt}\r\n`;
                                                                                                                                                        ics += `DTEND:${dt}\r\n`;
                                                                                                                                                            ics += `SUMMARY:ТО: ${op.name}\r\n`;
                                                                                                                                                                ics += `DESCRIPTION:Пробег: ${op.last_mileage} км\\nКатегория: ${op.category}${partsList}\r\n`;
                                                                                                                                                                    ics += `DTSTAMP:${now}\r\n`;
                                                                                                                                                                        ics += "END:VEVENT\r\n";
                                                                                                                                                                          });

                                                                                                                                                                            ics += "END:VCALENDAR\r\n";

                                                                                                                                                                              return new Response(ics, {
                                                                                                                                                                                  headers: {
                                                                                                                                                                                        "Content-Type": "text/calendar; charset=utf-8",
                                                                                                                                                                                              "Content-Disposition": "inline; filename=vesta.ics",
                                                                                                                                                                                                  },
                                                                                                                                                                                                    });
                                                                                                                                                                                                    });

                                                                                                                                                                                                    function calculatePlanDate(op: any): string | null {
                                                                                                                                                                                                      if (!op.last_date || !op.interval_months) return null;
                                                                                                                                                                                                        const last = new Date(op.last_date);
                                                                                                                                                                                                          last.setMonth(last.getMonth() + op.interval_months);
                                                                                                                                                                                                            return last.toISOString().split("T")[0];
                                                                                                                                                                                                            }