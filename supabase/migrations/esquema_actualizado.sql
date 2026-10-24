


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "bot";


ALTER SCHEMA "bot" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "bot"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" bigint,
    "channel" "text",
    "summary" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "last_at" timestamp with time zone,
    "summarized_upto" bigint DEFAULT 0 NOT NULL
);


ALTER TABLE "bot"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "bot"."messages" (
    "id" bigint NOT NULL,
    "conversation_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "bot"."messages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "bot"."messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "bot"."messages_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "bot"."messages_id_seq" OWNED BY "bot"."messages"."id";



CREATE TABLE IF NOT EXISTS "bot"."pending_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" bigint NOT NULL,
    "conversation_id" "uuid",
    "tool" "text" NOT NULL,
    "args" "jsonb" NOT NULL,
    "summary" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "resolved_at" timestamp with time zone,
    "outcome" "text"
);


ALTER TABLE "bot"."pending_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "bot"."tool_audit" (
    "id" bigint NOT NULL,
    "user_id" bigint,
    "tool" "text",
    "args" "jsonb",
    "result" "jsonb",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "conversation_id" "uuid"
);


ALTER TABLE "bot"."tool_audit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "bot"."tool_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "bot"."tool_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "bot"."tool_audit_id_seq" OWNED BY "bot"."tool_audit"."id";



CREATE TABLE IF NOT EXISTS "bot"."user_facts" (
    "user_id" bigint NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "source" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "bot"."user_facts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "bot"."users" (
    "id" bigint NOT NULL,
    "project_id" "text" NOT NULL,
    "external_user_id" "text" NOT NULL,
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "display_name" "text"
);


ALTER TABLE "bot"."users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "bot"."users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "bot"."users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "bot"."users_id_seq" OWNED BY "bot"."users"."id";



CREATE TABLE IF NOT EXISTS "public"."citas" (
    "id_cita" integer NOT NULL,
    "id_paciente" integer NOT NULL,
    "id_doctor" integer NOT NULL,
    "fecha_cita" "date" NOT NULL,
    "hora_cita" time without time zone NOT NULL,
    "motivo" "text",
    "estado" character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "citas_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['PENDIENTE'::character varying, 'CONFIRMADA'::character varying, 'CANCELADA'::character varying, 'COMPLETADA'::character varying])::"text"[])))
);


ALTER TABLE "public"."citas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."citas_id_cita_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."citas_id_cita_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."citas_id_cita_seq" OWNED BY "public"."citas"."id_cita";



CREATE TABLE IF NOT EXISTS "public"."doctores" (
    "id_doctor" integer NOT NULL,
    "dni" character varying(8) NOT NULL,
    "nombres" character varying(100) NOT NULL,
    "apellidos" character varying(100) NOT NULL,
    "correo" character varying(150) NOT NULL,
    "telefono" character varying(15),
    "id_especialidad" integer NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    CONSTRAINT "doctores_dni_formato_check" CHECK ((("dni")::"text" ~ '^[0-9]{8}$'::"text"))
);


ALTER TABLE "public"."doctores" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."doctores_id_doctor_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."doctores_id_doctor_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."doctores_id_doctor_seq" OWNED BY "public"."doctores"."id_doctor";



CREATE TABLE IF NOT EXISTS "public"."especialidades" (
    "id_especialidad" integer NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "descripcion" "text",
    "activo" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."especialidades" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."especialidades_id_especialidad_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."especialidades_id_especialidad_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."especialidades_id_especialidad_seq" OWNED BY "public"."especialidades"."id_especialidad";



CREATE TABLE IF NOT EXISTS "public"."horarios" (
    "id_horario" integer NOT NULL,
    "id_doctor" integer NOT NULL,
    "dia_semana" character varying(10) NOT NULL,
    "hora_inicio" time without time zone NOT NULL,
    "hora_fin" time without time zone NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    CONSTRAINT "horarios_dia_semana_check" CHECK ((("dia_semana")::"text" = ANY ((ARRAY['Lunes'::character varying, 'Martes'::character varying, 'Miércoles'::character varying, 'Jueves'::character varying, 'Viernes'::character varying, 'Sábado'::character varying, 'Domingo'::character varying])::"text"[]))),
    CONSTRAINT "horarios_rango_check" CHECK (("hora_fin" > "hora_inicio"))
);


ALTER TABLE "public"."horarios" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."horarios_id_horario_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."horarios_id_horario_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."horarios_id_horario_seq" OWNED BY "public"."horarios"."id_horario";



CREATE TABLE IF NOT EXISTS "public"."pacientes" (
    "id_paciente" integer NOT NULL,
    "dni" character varying(8) NOT NULL,
    "nombres" character varying(100) NOT NULL,
    "apellidos" character varying(100) NOT NULL,
    "correo" character varying(150) NOT NULL,
    "telefono" character varying(15),
    "fecha_nac" "date",
    "direccion" "text",
    "activo" boolean DEFAULT true NOT NULL,
    "contraseña" character varying(255) NOT NULL,
    "rol" character varying(20) DEFAULT 'PACIENTE'::character varying NOT NULL,
    CONSTRAINT "pacientes_dni_formato_check" CHECK ((("dni")::"text" ~ '^[0-9]{8,15}$'::"text")),
    CONSTRAINT "pacientes_rol_check" CHECK ((("rol")::"text" = ANY ((ARRAY['PACIENTE'::character varying, 'ADMIN'::character varying])::"text"[])))
);


ALTER TABLE "public"."pacientes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pacientes_id_paciente_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pacientes_id_paciente_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pacientes_id_paciente_seq" OWNED BY "public"."pacientes"."id_paciente";



CREATE TABLE IF NOT EXISTS "public"."pagos" (
    "id_pago" integer NOT NULL,
    "id_cita" integer NOT NULL,
    "monto" numeric(10,2) NOT NULL,
    "metodo_pago" character varying(20) NOT NULL,
    "estado_pago" character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    "fecha_pago" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "referencia" character varying(100),
    CONSTRAINT "pagos_estado_pago_check" CHECK ((("estado_pago")::"text" = ANY ((ARRAY['PENDIENTE'::character varying, 'COMPLETADO'::character varying, 'RECHAZADO'::character varying])::"text"[]))),
    CONSTRAINT "pagos_metodo_pago_check" CHECK ((("metodo_pago")::"text" = ANY ((ARRAY['YAPE'::character varying, 'TARJETA'::character varying, 'EFECTIVO'::character varying])::"text"[]))),
    CONSTRAINT "pagos_monto_positivo_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."pagos" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pagos_id_pago_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pagos_id_pago_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pagos_id_pago_seq" OWNED BY "public"."pagos"."id_pago";



CREATE TABLE IF NOT EXISTS "public"."precios" (
    "id_precio" integer NOT NULL,
    "id_especialidad" integer NOT NULL,
    "descripcion" character varying(200) NOT NULL,
    "monto" numeric(10,2) NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    CONSTRAINT "precios_monto_positivo_check" CHECK (("monto" > (0)::numeric))
);


ALTER TABLE "public"."precios" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."precios_id_precio_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."precios_id_precio_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."precios_id_precio_seq" OWNED BY "public"."precios"."id_precio";



ALTER TABLE ONLY "bot"."messages" ALTER COLUMN "id" SET DEFAULT "nextval"('"bot"."messages_id_seq"'::"regclass");



ALTER TABLE ONLY "bot"."tool_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"bot"."tool_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "bot"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"bot"."users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."citas" ALTER COLUMN "id_cita" SET DEFAULT "nextval"('"public"."citas_id_cita_seq"'::"regclass");



ALTER TABLE ONLY "public"."doctores" ALTER COLUMN "id_doctor" SET DEFAULT "nextval"('"public"."doctores_id_doctor_seq"'::"regclass");



ALTER TABLE ONLY "public"."especialidades" ALTER COLUMN "id_especialidad" SET DEFAULT "nextval"('"public"."especialidades_id_especialidad_seq"'::"regclass");



ALTER TABLE ONLY "public"."horarios" ALTER COLUMN "id_horario" SET DEFAULT "nextval"('"public"."horarios_id_horario_seq"'::"regclass");



ALTER TABLE ONLY "public"."pacientes" ALTER COLUMN "id_paciente" SET DEFAULT "nextval"('"public"."pacientes_id_paciente_seq"'::"regclass");



ALTER TABLE ONLY "public"."pagos" ALTER COLUMN "id_pago" SET DEFAULT "nextval"('"public"."pagos_id_pago_seq"'::"regclass");



ALTER TABLE ONLY "public"."precios" ALTER COLUMN "id_precio" SET DEFAULT "nextval"('"public"."precios_id_precio_seq"'::"regclass");



ALTER TABLE ONLY "bot"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "bot"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "bot"."pending_actions"
    ADD CONSTRAINT "pending_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "bot"."tool_audit"
    ADD CONSTRAINT "tool_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "bot"."user_facts"
    ADD CONSTRAINT "user_facts_pkey" PRIMARY KEY ("user_id", "key");



ALTER TABLE ONLY "bot"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "bot"."users"
    ADD CONSTRAINT "users_project_id_external_user_id_key" UNIQUE ("project_id", "external_user_id");



ALTER TABLE ONLY "public"."citas"
    ADD CONSTRAINT "citas_pkey" PRIMARY KEY ("id_cita");



ALTER TABLE ONLY "public"."doctores"
    ADD CONSTRAINT "doctores_correo_key" UNIQUE ("correo");



ALTER TABLE ONLY "public"."doctores"
    ADD CONSTRAINT "doctores_dni_key" UNIQUE ("dni");



ALTER TABLE ONLY "public"."doctores"
    ADD CONSTRAINT "doctores_pkey" PRIMARY KEY ("id_doctor");



ALTER TABLE ONLY "public"."especialidades"
    ADD CONSTRAINT "especialidades_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."especialidades"
    ADD CONSTRAINT "especialidades_pkey" PRIMARY KEY ("id_especialidad");



ALTER TABLE ONLY "public"."horarios"
    ADD CONSTRAINT "horarios_pkey" PRIMARY KEY ("id_horario");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_correo_key" UNIQUE ("correo");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_dni_key" UNIQUE ("dni");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id_paciente");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_id_cita_key" UNIQUE ("id_cita");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pkey" PRIMARY KEY ("id_pago");



ALTER TABLE ONLY "public"."precios"
    ADD CONSTRAINT "precios_pkey" PRIMARY KEY ("id_precio");



CREATE INDEX "ix_pending_user" ON "bot"."pending_actions" USING "btree" ("user_id") WHERE ("resolved_at" IS NULL);



CREATE UNIQUE INDEX "ux_bot_facts_user_key" ON "bot"."user_facts" USING "btree" ("user_id", "key");



CREATE UNIQUE INDEX "ux_bot_users_proj_ext" ON "bot"."users" USING "btree" ("project_id", "external_user_id");



CREATE INDEX "idx_citas_doctor_fecha" ON "public"."citas" USING "btree" ("id_doctor", "fecha_cita");



CREATE INDEX "idx_citas_paciente" ON "public"."citas" USING "btree" ("id_paciente");



CREATE INDEX "idx_citas_pendientes_created" ON "public"."citas" USING "btree" ("created_at") WHERE (("estado")::"text" = 'PENDIENTE'::"text");



CREATE INDEX "idx_doctores_especialidad" ON "public"."doctores" USING "btree" ("id_especialidad");



CREATE INDEX "idx_horarios_doctor" ON "public"."horarios" USING "btree" ("id_doctor");



CREATE INDEX "idx_pagos_completados" ON "public"."pagos" USING "btree" ("id_cita") INCLUDE ("monto") WHERE (("estado_pago")::"text" = 'COMPLETADO'::"text");



CREATE INDEX "idx_precios_especialidad" ON "public"."precios" USING "btree" ("id_especialidad");



CREATE UNIQUE INDEX "ux_citas_doctor_fecha_hora_activa" ON "public"."citas" USING "btree" ("id_doctor", "fecha_cita", "hora_cita") WHERE (("estado")::"text" <> 'CANCELADA'::"text");



CREATE UNIQUE INDEX "ux_horarios_doctor_dia_activo" ON "public"."horarios" USING "btree" ("id_doctor", "dia_semana") WHERE "activo";



CREATE UNIQUE INDEX "ux_precios_especialidad_activo" ON "public"."precios" USING "btree" ("id_especialidad") WHERE "activo";



ALTER TABLE ONLY "bot"."conversations"
    ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "bot"."users"("id");



ALTER TABLE ONLY "bot"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "bot"."conversations"("id");



ALTER TABLE ONLY "bot"."pending_actions"
    ADD CONSTRAINT "pending_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "bot"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "bot"."user_facts"
    ADD CONSTRAINT "user_facts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "bot"."users"("id");



ALTER TABLE ONLY "public"."citas"
    ADD CONSTRAINT "citas_id_doctor_fkey" FOREIGN KEY ("id_doctor") REFERENCES "public"."doctores"("id_doctor");



ALTER TABLE ONLY "public"."citas"
    ADD CONSTRAINT "citas_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "public"."pacientes"("id_paciente");



ALTER TABLE ONLY "public"."doctores"
    ADD CONSTRAINT "doctores_id_especialidad_fkey" FOREIGN KEY ("id_especialidad") REFERENCES "public"."especialidades"("id_especialidad");



ALTER TABLE ONLY "public"."horarios"
    ADD CONSTRAINT "horarios_id_doctor_fkey" FOREIGN KEY ("id_doctor") REFERENCES "public"."doctores"("id_doctor");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_id_cita_fkey" FOREIGN KEY ("id_cita") REFERENCES "public"."citas"("id_cita");



ALTER TABLE ONLY "public"."precios"
    ADD CONSTRAINT "precios_id_especialidad_fkey" FOREIGN KEY ("id_especialidad") REFERENCES "public"."especialidades"("id_especialidad");



ALTER TABLE "bot"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "bot"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "bot"."pending_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "bot"."tool_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "bot"."user_facts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "bot"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."citas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."especialidades" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."horarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pacientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."precios" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."citas" TO "anon";
GRANT ALL ON TABLE "public"."citas" TO "authenticated";
GRANT ALL ON TABLE "public"."citas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."citas_id_cita_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."citas_id_cita_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."citas_id_cita_seq" TO "service_role";



GRANT ALL ON TABLE "public"."doctores" TO "anon";
GRANT ALL ON TABLE "public"."doctores" TO "authenticated";
GRANT ALL ON TABLE "public"."doctores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."doctores_id_doctor_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."doctores_id_doctor_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."doctores_id_doctor_seq" TO "service_role";



GRANT ALL ON TABLE "public"."especialidades" TO "anon";
GRANT ALL ON TABLE "public"."especialidades" TO "authenticated";
GRANT ALL ON TABLE "public"."especialidades" TO "service_role";



GRANT ALL ON SEQUENCE "public"."especialidades_id_especialidad_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."especialidades_id_especialidad_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."especialidades_id_especialidad_seq" TO "service_role";



GRANT ALL ON TABLE "public"."horarios" TO "anon";
GRANT ALL ON TABLE "public"."horarios" TO "authenticated";
GRANT ALL ON TABLE "public"."horarios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."horarios_id_horario_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."horarios_id_horario_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."horarios_id_horario_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pacientes" TO "anon";
GRANT ALL ON TABLE "public"."pacientes" TO "authenticated";
GRANT ALL ON TABLE "public"."pacientes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pacientes_id_paciente_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pacientes_id_paciente_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pacientes_id_paciente_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pagos" TO "anon";
GRANT ALL ON TABLE "public"."pagos" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pagos_id_pago_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pagos_id_pago_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pagos_id_pago_seq" TO "service_role";



GRANT ALL ON TABLE "public"."precios" TO "anon";
GRANT ALL ON TABLE "public"."precios" TO "authenticated";
GRANT ALL ON TABLE "public"."precios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."precios_id_precio_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."precios_id_precio_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."precios_id_precio_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































