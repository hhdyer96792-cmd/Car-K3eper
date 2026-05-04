table_name,column_name,data_type,is_nullable
calendar_tokens,id,uuid,NO
calendar_tokens,car_id,uuid,NO
calendar_tokens,token,text,NO
calendar_tokens,created_at,timestamp with time zone,YES
car_profiles,id,text,NO
car_profiles,name,text,YES
car_profiles,last_used,timestamp with time zone,YES
car_shares,id,uuid,NO
car_shares,car_id,uuid,NO
car_shares,invited_email,text,YES
car_shares,invited_user_id,uuid,YES
car_shares,accepted,boolean,YES
car_shares,invite_code,uuid,NO
car_shares,created_at,timestamp with time zone,YES
cars,id,uuid,NO
cars,user_id,uuid,NO
cars,name,text,NO
cars,created_at,timestamp with time zone,YES
fuel_log,id,uuid,NO
fuel_log,date,date,YES
fuel_log,mileage,numeric,YES
fuel_log,liters,numeric,YES
fuel_log,price_per_liter,numeric,YES
fuel_log,full_tank,boolean,YES
fuel_log,fuel_type,text,YES
fuel_log,notes,text,YES
fuel_log,updated_at,timestamp with time zone,YES
fuel_log,user_id,uuid,NO
fuel_log,car_id,uuid,YES
history,id,uuid,NO
history,operation_id,uuid,YES
history,date,date,YES
history,mileage,numeric,YES
history,motohours,numeric,YES
history,parts_cost,numeric,YES
history,work_cost,numeric,YES
history,is_diy,boolean,YES
history,notes,text,YES
history,photo_url,text,YES
history,recorded_at,timestamp with time zone,YES
history,updated_at,timestamp with time zone,YES
history,user_id,uuid,NO
history,car_id,uuid,YES
mileage_log,id,uuid,NO
mileage_log,date,date,YES
mileage_log,mileage,numeric,YES
mileage_log,motohours,numeric,YES
mileage_log,updated_at,timestamp with time zone,YES
mileage_log,user_id,uuid,NO
mileage_log,car_id,uuid,YES
operations,id,uuid,NO
operations,category,text,YES
operations,name,text,YES
operations,last_date,date,YES
operations,last_mileage,numeric,YES
operations,last_motohours,numeric,YES
operations,interval_km,numeric,YES
operations,interval_months,numeric,YES
operations,interval_motohours,numeric,YES
operations,updated_at,timestamp with time zone,YES
operations,user_id,uuid,NO
operations,car_id,uuid,YES
parts,id,uuid,NO
parts,operation,text,YES
parts,oem,text,YES
parts,analog,text,YES
parts,price,numeric,YES
parts,supplier,text,YES
parts,link,text,YES
parts,comment,text,YES
parts,in_stock,numeric,YES
parts,location,text,YES
parts,updated_at,timestamp with time zone,YES
parts,user_id,uuid,NO
parts,car_id,uuid,YES
push_subscriptions,user_id,uuid,NO
push_subscriptions,player_id,text,NO
push_subscriptions,updated_at,timestamp with time zone,YES
recovery_codes,id,uuid,NO
recovery_codes,user_id,uuid,NO
recovery_codes,code_hash,text,NO
recovery_codes,used,boolean,YES
recovery_codes,created_at,timestamp with time zone,YES
settings,id,integer,NO
settings,current_mileage,numeric,YES
settings,current_motohours,numeric,YES
settings,avg_daily_mileage,numeric,YES
settings,avg_daily_motohours,numeric,YES
settings,telegram_token,text,YES
settings,telegram_chat_id,text,YES
settings,user_id,uuid,NO
settings,car_id,uuid,NO
tires,id,uuid,NO
tires,date,date,YES
tires,type,text,YES
tires,mileage,numeric,YES
tires,model,text,YES
tires,size,text,YES
tires,wear,text,YES
tires,notes,text,YES

proname,prosrc
can_access_car,"
  select exists (
      select 1
          from cars
              where id = target_car_id
                    and (
                            user_id = auth.uid()
                                    or exists (
                                              select 1 from car_shares
                                                        where car_id = target_car_id
                                                                    and invited_user_id = auth.uid()
                                                                                and accepted = true
                                                                                        )
                                                                                              )
                                                                                                );
                                                                                                "
get_email_by_username,"
  select email
    from auth.users
      where raw_user_meta_data ->> 'username' = p_username
        limit 1;
        "
get_or_create_calendar_token,"
declare
  v_token text;
  begin
    select token into v_token from calendar_tokens where car_id = p_car_id;
      if not found then
          v_token := encode(gen_random_bytes(24), 'hex');
              insert into calendar_tokens (car_id, token) values (p_car_id, v_token);
                end if;
                  return v_token;
                  end;
                  "
get_user_by_username,"
          begin
            return query
              select u.id, u.email::text
                from auth.users u
                  where u.raw_user_meta_data ->> 'username' = p_username
                    limit 1;
                    end;
                    "
                    
schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
public,cars,Accessible cars are visible,PERMISSIVE,{public},SELECT,can_access_car(id),null
public,operations,Access own or shared car operations,PERMISSIVE,{public},ALL,can_access_car(car_id),null
public,history,Access own or shared car history,PERMISSIVE,{public},ALL,can_access_car(car_id),null
public,parts,Access own or shared car parts,PERMISSIVE,{public},ALL,can_access_car(car_id),null
public,tires,Access own or shared car tires,PERMISSIVE,{public},ALL,can_access_car(car_id),null
public,fuel_log,Access own or shared car fuel_log,PERMISSIVE,{public},ALL,can_access_car(car_id),null
public,work_costs,Access own or shared car work_costs,PERMISSIVE,{public},ALL,can_access_car(car_id),null
public,mileage_log,Access own or shared car mileage_log,PERMISSIVE,{public},ALL,can_access_car(car_id),null
public,settings,Access own or shared car settings,PERMISSIVE,{public},ALL,can_access_car(car_id),null
public,calendar_tokens,Allow all for authenticated,PERMISSIVE,{authenticated},ALL,true,true
public,recovery_codes,Users can insert their own recovery codes,PERMISSIVE,{public},INSERT,null,(auth.uid() = user_id)
public,recovery_codes,Users can read their own recovery codes,PERMISSIVE,{public},SELECT,(auth.uid() = user_id),null
public,recovery_codes,Users can delete their own recovery codes,PERMISSIVE,{public},DELETE,(auth.uid() = user_id),null
public,recovery_codes,Users can update their own recovery codes,PERMISSIVE,{public},UPDATE,(auth.uid() = user_id),(auth.uid() = user_id)
public,recovery_codes,Allow select for all on recovery_codes,PERMISSIVE,{public},SELECT,true,null
public,push_subscriptions,Users can manage their own push subscriptions,PERMISSIVE,{public},ALL,(auth.uid() = user_id),(auth.uid() = user_id)
public,cars,Owner can manage cars,PERMISSIVE,{public},ALL,(auth.uid() = user_id),null                    