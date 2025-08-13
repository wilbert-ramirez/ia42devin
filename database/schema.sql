CREATE SCHEMA IF NOT EXISTS "public";

CREATE SEQUENCE "public".ia42webmsj_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".inscriptions_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".ld_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".ld_progress_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".login_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".lx_category_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".lx_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".lx_price_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".lx_prompt_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".movements_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".n8n_chat_histories_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".opinion_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".outcome_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".payment_method_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".skill_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".skill_progress_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE SEQUENCE "public".studentlog_id_seq AS integer START WITH 1 INCREMENT BY 1;

CREATE  TABLE "public".ia42webmsj ( 
	id                   serial  NOT NULL  ,
	full_name            varchar(100)  NOT NULL  ,
	email                "public".email_type  NOT NULL  ,
	subject              varchar(200)  NOT NULL  ,
	message              text  NOT NULL  ,
	sent_at              timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL  ,
	attended             boolean DEFAULT false NOT NULL  ,
	attention            text    ,
	attended_by          varchar(100)    ,
	resolution           text    ,
	resolved_at          timestamptz    ,
	CONSTRAINT ia42webmsj_pkey PRIMARY KEY ( id )
 );

CREATE  TABLE "public".lx_category ( 
	id                   serial  NOT NULL  ,
	name                 varchar(100)    ,
	description          text    ,
	CONSTRAINT lx_category_pkey PRIMARY KEY ( id ),
	CONSTRAINT lx_category_name_unique UNIQUE ( name ) 
 );

CREATE  TABLE "public".lx_prompt ( 
	id                   serial  NOT NULL  ,
	description          text    ,
	section1             text    ,
	section2             text    ,
	section3             text    ,
	section4             text    ,
	section5             text    ,
	section6             text    ,
	active               boolean DEFAULT true   ,
	namespace1           varchar(100)    ,
	index1               varchar(100)    ,
	status               varchar DEFAULT 'active'::character varying   ,
	index2               varchar(100)    ,
	namespace2           varchar(100)    ,
	tool1_config         text    ,
	tool2_config         text    ,
	tool3_config         text    ,
	tool4_config         text    ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	updated_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	CONSTRAINT lx_prompt_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".lx_prompt ADD CONSTRAINT lx_prompt_status_check CHECK ( status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'draft'::character varying])::text[] );

CREATE  TABLE "public".payment_method ( 
	id                   serial  NOT NULL  ,
	name                 varchar(100)  NOT NULL  ,
	description          text    ,
	active               boolean DEFAULT true   ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	CONSTRAINT payment_method_pkey PRIMARY KEY ( id ),
	CONSTRAINT payment_method_name_unique UNIQUE ( name ) 
 );

CREATE  TABLE "public".student ( 
	id                   uuid  NOT NULL  ,
	name                 varchar(255)    ,
	email                text  NOT NULL  ,
	birthdate            date    ,
	signupdate           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	read_privacy         boolean DEFAULT false   ,
	read_terms           boolean DEFAULT false   ,
	balance              numeric DEFAULT 0   ,
	status               varchar DEFAULT 'Pending Confirmation'::character varying   ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	updated_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	CONSTRAINT student_pkey PRIMARY KEY ( id ),
	CONSTRAINT student_email_key UNIQUE ( email ) 
 );

ALTER TABLE "public".student ADD CONSTRAINT student_balance_positive CHECK ( balance >= (0)::numeric );

ALTER TABLE "public".student ADD CONSTRAINT student_status_check CHECK ( status)::text = ANY ((ARRAY['Pending Confirmation'::character varying, 'Active'::character varying, 'Inactive'::character varying, 'Suspended'::character varying])::text[] );

CREATE INDEX idx_student_email_lower ON "public".student USING  btree ( lower(email) );

CREATE INDEX idx_student_status ON "public".student USING  btree ( status );

CREATE  TABLE "public".studentlog ( 
	id                   serial  NOT NULL  ,
	id_student           uuid  NOT NULL  ,
	status               varchar    ,
	logdate              timestamptz    ,
	details              jsonb    ,
	CONSTRAINT studentlog_pkey PRIMARY KEY ( id )
 );

CREATE INDEX idx_studentlog_student ON "public".studentlog USING  btree ( id_student );

CREATE  TABLE "public"."user" ( 
	id                   uuid DEFAULT gen_random_uuid() NOT NULL  ,
	email                text  NOT NULL  ,
	full_name            text    ,
	password_hash        text    ,
	email_confirmed      boolean DEFAULT false   ,
	confirmed_at         timestamp    ,
	created_at           timestamp DEFAULT CURRENT_TIMESTAMP   ,
	CONSTRAINT users_pkey PRIMARY KEY ( id ),
	CONSTRAINT users_email_key UNIQUE ( email ) 
 );

CREATE  TABLE "public".login ( 
	id                   serial  NOT NULL  ,
	id_student           uuid  NOT NULL  ,
	login                timestamptz    ,
	device               text    ,
	logout               timestamptz    ,
	location             text    ,
	CONSTRAINT login_pkey PRIMARY KEY ( id )
 );

CREATE INDEX idx_login_student ON "public".login USING  btree ( id_student );

CREATE  TABLE "public".lx_price ( 
	id                   serial  NOT NULL  ,
	id_payment_method    integer    ,
	amount               numeric    ,
	discount             numeric    ,
	status               varchar DEFAULT 'active'::character varying   ,
	startdate            date    ,
	CONSTRAINT lx_price_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".lx_price ADD CONSTRAINT lx_price_amount_positive CHECK ( amount IS NULL) OR (amount >= (0)::numeric );

ALTER TABLE "public".lx_price ADD CONSTRAINT lx_price_discount_valid CHECK ( discount IS NULL) OR ((discount >= (0)::numeric) AND (discount <= (100)::numeric) );

ALTER TABLE "public".lx_price ADD CONSTRAINT lx_price_status_check CHECK ( status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'expired'::character varying])::text[] );

CREATE INDEX idx_lx_price_payment_method ON "public".lx_price USING  btree ( id_payment_method );

CREATE  TABLE "public".movements ( 
	id                   serial  NOT NULL  ,
	id_student           uuid  NOT NULL  ,
	amount               numeric  NOT NULL  ,
	description          text  NOT NULL  ,
	movementtype         varchar(20)  NOT NULL  ,
	status               varchar DEFAULT 'completed'::character varying   ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	CONSTRAINT movements_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".movements ADD CONSTRAINT movements_amount_check CHECK ( amount <> (0)::numeric );

ALTER TABLE "public".movements ADD CONSTRAINT movements_status_check CHECK ( status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'failed'::character varying])::text[] );

ALTER TABLE "public".movements ADD CONSTRAINT movements_type_check CHECK ( movementtype)::text = ANY ((ARRAY['credit'::character varying, 'debit'::character varying, 'refund'::character varying, 'penalty'::character varying])::text[] );

CREATE INDEX idx_movements_student ON "public".movements USING  btree ( id_student );

CREATE INDEX idx_movements_type ON "public".movements USING  btree ( movementtype );

CREATE INDEX idx_movements_created_at ON "public".movements USING  btree ( created_at );

CREATE  TABLE "public".lx ( 
	id                   serial  NOT NULL  ,
	shortname            varchar(50)  NOT NULL  ,
	description          text    ,
	id_lx_category       integer  NOT NULL  ,
	imagepath            "public".image_path_type    ,
	status               varchar DEFAULT 'active'::character varying   ,
	id_lx_price          integer    ,
	id_lx_prompt         integer  NOT NULL  ,
	standout             boolean DEFAULT true   ,
	wf_hookup            varchar DEFAULT ''::character varying   ,
	focus                text    ,
	technical_desc       text    ,
	commercial_desc      text    ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	updated_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	CONSTRAINT lx_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".lx ADD CONSTRAINT lx_shortname_length CHECK ( length(TRIM(BOTH FROM shortname)) >= 2 );

ALTER TABLE "public".lx ADD CONSTRAINT lx_status_check CHECK ( status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'draft'::character varying, 'archived'::character varying])::text[] );

CREATE INDEX idx_lx_category ON "public".lx USING  btree ( id_lx_category );

CREATE INDEX idx_lx_price ON "public".lx USING  btree ( id_lx_price );

CREATE INDEX idx_lx_prompt ON "public".lx USING  btree ( id_lx_prompt );

CREATE INDEX idx_lx_status ON "public".lx USING  btree ( status );

CREATE INDEX idx_lx_shortname ON "public".lx USING  btree ( shortname );

CREATE  TABLE "public".opinion ( 
	id                   serial  NOT NULL  ,
	id_student           uuid  NOT NULL  ,
	stars                integer  NOT NULL  ,
	text                 text    ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	status               varchar DEFAULT 'active'::character varying   ,
	id_lx                integer  NOT NULL  ,
	CONSTRAINT opinion_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".opinion ADD CONSTRAINT opinion_stars_check CHECK ( stars >= 1) AND (stars <= 5 );

ALTER TABLE "public".opinion ADD CONSTRAINT opinion_status_check CHECK ( status)::text = ANY ((ARRAY['active'::character varying, 'hidden'::character varying, 'pending_review'::character varying])::text[] );

ALTER TABLE "public".opinion ADD CONSTRAINT opinion_text_meaningful CHECK ( text IS NULL) OR (length(TRIM(BOTH FROM text)) >= 10 );

CREATE INDEX idx_opinion_student ON "public".opinion USING  btree ( id_student );

CREATE INDEX idx_opinion_lx ON "public".opinion USING  btree ( id_lx );

CREATE INDEX idx_opinion_stars ON "public".opinion USING  btree ( stars );

CREATE  TABLE "public".skill ( 
	id                   serial  NOT NULL  ,
	id_lx                integer  NOT NULL  ,
	proficiency          text  NOT NULL  ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	reference            text    ,
	CONSTRAINT skill_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".skill ADD CONSTRAINT skill_description_length CHECK ( length(TRIM(BOTH FROM proficiency)) >= 5 );

CREATE INDEX idx_skill_lx ON "public".skill USING  btree ( id_lx );

CREATE  TABLE "public".skill_progress ( 
	id                   serial  NOT NULL  ,
	id_student           uuid  NOT NULL  ,
	id_skill             integer  NOT NULL  ,
	progress_pct         numeric    ,
	last_updated         timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL  ,
	CONSTRAINT skill_progress_pkey PRIMARY KEY ( id ),
	CONSTRAINT skill_progress_unique_per_skill UNIQUE ( id_student, id_skill ) 
 );

ALTER TABLE "public".skill_progress ADD CONSTRAINT skill_progress_progress_pct_check CHECK ( progress_pct >= (0)::numeric) AND (progress_pct <= (100)::numeric );

CREATE  TABLE "public".inscriptions ( 
	id                   serial  NOT NULL  ,
	id_student           uuid  NOT NULL  ,
	status               varchar DEFAULT 'active'::character varying   ,
	priceliststart       numeric    ,
	pricelistactual      numeric    ,
	inscriptiondate      timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	id_lx                integer  NOT NULL  ,
	currentprogress      integer DEFAULT 0   ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	updated_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	CONSTRAINT inscriptions_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".inscriptions ADD CONSTRAINT inscriptions_actual_price_positive CHECK ( pricelistactual IS NULL) OR (pricelistactual >= (0)::numeric );

ALTER TABLE "public".inscriptions ADD CONSTRAINT inscriptions_currentprogress_check CHECK ( currentprogress >= 0) AND (currentprogress <= 100 );

ALTER TABLE "public".inscriptions ADD CONSTRAINT inscriptions_prices_positive CHECK ( priceliststart IS NULL) OR (priceliststart >= (0)::numeric );

ALTER TABLE "public".inscriptions ADD CONSTRAINT inscriptions_status_check CHECK ( status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[] );

CREATE INDEX idx_inscriptions_student ON "public".inscriptions USING  btree ( id_student );

CREATE INDEX idx_inscriptions_lx ON "public".inscriptions USING  btree ( id_lx );

CREATE INDEX idx_inscriptions_status ON "public".inscriptions USING  btree ( status );

CREATE  TABLE "public".outcome ( 
	id                   serial  NOT NULL  ,
	id_skill             integer  NOT NULL  ,
	expected             text  NOT NULL  ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	reference            text    ,
	CONSTRAINT outcome_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".outcome ADD CONSTRAINT outcome_description_length CHECK ( length(TRIM(BOTH FROM expected)) >= 5 );

CREATE INDEX idx_outcome_skill ON "public".outcome USING  btree ( id_skill );

CREATE  TABLE "public".ld ( 
	id                   serial  NOT NULL  ,
	id_outcome           integer  NOT NULL  ,
	ld_type              varchar(20)  NOT NULL  ,
	"domain"             text  NOT NULL  ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	reference            text    ,
	CONSTRAINT ld_pkey PRIMARY KEY ( id )
 );

ALTER TABLE "public".ld ADD CONSTRAINT ld_descripcion_length CHECK ( length(TRIM(BOTH FROM domain)) >= 10 );

CREATE INDEX idx_ld_outcome ON "public".ld USING  btree ( id_outcome );

CREATE  TABLE "public".ld_progress ( 
	id                   serial  NOT NULL  ,
	id_student           uuid  NOT NULL  ,
	id_lx                integer  NOT NULL  ,
	id_ld                integer  NOT NULL  ,
	assessment           text    ,
	created_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	updated_at           timestamptz DEFAULT CURRENT_TIMESTAMP   ,
	completed            boolean DEFAULT false   ,
	CONSTRAINT ld_progress_pkey PRIMARY KEY ( id ),
	CONSTRAINT ld_progress_unique_student_lx_ld UNIQUE ( id_student, id_lx, id_ld ) 
 );

CREATE INDEX idx_ld_progress_student ON "public".ld_progress USING  btree ( id_student );

CREATE INDEX idx_ld_progress_lx ON "public".ld_progress USING  btree ( id_lx );

CREATE INDEX idx_ld_progress_ld ON "public".ld_progress USING  btree ( id_ld );

ALTER TABLE "public".inscriptions ADD CONSTRAINT fk_inscriptions_student FOREIGN KEY ( id_student ) REFERENCES "public".student( id ) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public".inscriptions ADD CONSTRAINT fk_inscriptions_lx FOREIGN KEY ( id_lx ) REFERENCES "public".lx( id ) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public".ld ADD CONSTRAINT fk_ld_outcome FOREIGN KEY ( id_outcome ) REFERENCES "public".outcome( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".ld_progress ADD CONSTRAINT fk_ld_progress_student FOREIGN KEY ( id_student ) REFERENCES "public".student( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".ld_progress ADD CONSTRAINT fk_ld_progress_lx FOREIGN KEY ( id_lx ) REFERENCES "public".lx( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".ld_progress ADD CONSTRAINT fk_ld_progress_ld FOREIGN KEY ( id_ld ) REFERENCES "public".ld( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".login ADD CONSTRAINT fk_login_student FOREIGN KEY ( id_student ) REFERENCES "public".student( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".lx ADD CONSTRAINT fk_lx_category FOREIGN KEY ( id_lx_category ) REFERENCES "public".lx_category( id ) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public".lx ADD CONSTRAINT fk_lx_price FOREIGN KEY ( id_lx_price ) REFERENCES "public".lx_price( id ) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public".lx ADD CONSTRAINT fk_lx_prompt FOREIGN KEY ( id_lx_prompt ) REFERENCES "public".lx_prompt( id ) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public".lx_price ADD CONSTRAINT fk_lx_price_payment_method FOREIGN KEY ( id_payment_method ) REFERENCES "public".payment_method( id ) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public".movements ADD CONSTRAINT fk_movements_student FOREIGN KEY ( id_student ) REFERENCES "public".student( id ) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public".opinion ADD CONSTRAINT fk_opinion_student FOREIGN KEY ( id_student ) REFERENCES "public".student( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".opinion ADD CONSTRAINT fk_opinion_lx FOREIGN KEY ( id_lx ) REFERENCES "public".lx( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".outcome ADD CONSTRAINT fk_outcome_skill FOREIGN KEY ( id_skill ) REFERENCES "public".skill( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".skill ADD CONSTRAINT fk_skill_lx FOREIGN KEY ( id_lx ) REFERENCES "public".lx( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".skill_progress ADD CONSTRAINT fk_skill_progress_student FOREIGN KEY ( id_student ) REFERENCES "public".student( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".skill_progress ADD CONSTRAINT fk_skill_progress_skill FOREIGN KEY ( id_skill ) REFERENCES "public".skill( id ) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public".studentlog ADD CONSTRAINT fk_studentlog_student FOREIGN KEY ( id_student ) REFERENCES "public".student( id ) ON DELETE CASCADE ON UPDATE CASCADE;
