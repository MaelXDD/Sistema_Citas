


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


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



ALTER TABLE ONLY "public"."citas" ALTER COLUMN "id_cita" SET DEFAULT "nextval"('"public"."citas_id_cita_seq"'::"regclass");



ALTER TABLE ONLY "public"."doctores" ALTER COLUMN "id_doctor" SET DEFAULT "nextval"('"public"."doctores_id_doctor_seq"'::"regclass");



ALTER TABLE ONLY "public"."especialidades" ALTER COLUMN "id_especialidad" SET DEFAULT "nextval"('"public"."especialidades_id_especialidad_seq"'::"regclass");



ALTER TABLE ONLY "public"."horarios" ALTER COLUMN "id_horario" SET DEFAULT "nextval"('"public"."horarios_id_horario_seq"'::"regclass");



ALTER TABLE ONLY "public"."pacientes" ALTER COLUMN "id_paciente" SET DEFAULT "nextval"('"public"."pacientes_id_paciente_seq"'::"regclass");



ALTER TABLE ONLY "public"."pagos" ALTER COLUMN "id_pago" SET DEFAULT "nextval"('"public"."pagos_id_pago_seq"'::"regclass");



ALTER TABLE ONLY "public"."precios" ALTER COLUMN "id_precio" SET DEFAULT "nextval"('"public"."precios_id_precio_seq"'::"regclass");



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































