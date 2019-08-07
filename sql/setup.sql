create table users (
  uuid char(36),
	firstname varchar(128),
	lastname varchar(128),
	mobile_number varchar(20),
	email_address varchar(128),
	modified timestamp(6),
	created timestamp(6)
);


create table user_passwords (
  uuid char(36),
  user_uuid char(36),
	password text,
	salt text,
	modified timestamp(6),
	created timestamp(6)
);


create table user_pins (
  uuid char(36),
  user_uuid char(36),
	pin text,
	salt text,
	modified timestamp(6),
	created timestamp(6)
);


create table accounts (
  uuid char(36),
	user_uuid char(36),
	name varchar(128),
	address varchar(60),
	private_key varchar(60),
	mnemonic text,
	encr_key text,
	account_type varchar(50),
	created timestamp(6)
);

create table beneficiaries (
  uuid char(36),
	user_uuid char(36),
	beneficiary_user_uuid varchar(36),
	beneficiary_account_uuid varchar(36),
	name varchar(128),
	mobile_number varchar(20),
	email_address varchar(128),
	acccount_address varchar(32),
	reference varchar(128),
	created timestamp(6)
);


create table banks (
	uuid char(36),
	name varchar(128),
	branch_code varchar(16),
	created timestamp(6)
);


create table bank_account_types (
	uuid char(36),
	account_type varchar(128),
	created timestamp(6)
);


create table bank_accounts (
  uuid char(36),
	user_uuid char(36),
	bank_uuid char(36),
	name varchar(128),
	full_name varchar(128),
	account_number varchar(32),
	account_type_uuid char(36),
	kyc_approved boolean,
	created timestamp(6)
);


create table kyc (
  uuid char(36),
	user_uuid char(36),
	kyc_level numeric,
	kyc_level_uuid char(36),
	modified timestamp(6),
	created timestamp(6)
);


create table kyc_levels (
	uuid char(36),
	name varchar(32),
	deposits boolean,
	min_deposit numeric,
	max_deposit numeric,
	withdrawals boolean,
	min_withdrawal numeric,
	max_withdrawal numeric,
	created timestamp(6)
);


create table kyc_documents (
  uuid char(36),
	user_uuid char(36),
	kyc_uuid char(36),
	account_uuid char(36),
	document_type_uuid text,
	document_path text,
	created timestamp(6)
);


create table document_types (
  uuid char(36),
	document_type varchar(128),
	created timestamp(6)
);


create table otp (
  uuid char(36),
	user_uuid char(36),
	token varchar(10),
	sent boolean,
	sent_time timestamp(6),
	validated boolean,
	validated_time timestamp(6),
	created timestamp(6),
	modified timestamp(6)
);


create table payments (
  uuid char(36),
	user_uuid char(36),
	account_uuid char(36),
	beneficiary_uuid char(36),
	amount numeric,
	reference varchar(128),
	created timestamp(6)
);


create table payment_notifications (
	uuid char(36),
	payment_uuid char(36),
	user_uuid char(36),
	notification_channel_uuid char(36),
	created timestamp(6)
);


create table notification_channels (
	uuid char(36),
	description varchar(32),
	created timestamp(6)
);


create table deposit_details (
	uuid char(36),
	bank_name varchar(128),
	account_number varchar(16),
	branch_code varchar(16),
	account_type_uuid char(36),
	created timestamp(6),
	modified timestamp(6)
);


create table deposit_references (
  uuid char(36),
	user_uuid char(36),
	reference varchar(10),
	created timestamp(6)
);


create table deposits (
  uuid char(36),
	user_uuid char(36),
	account_uuid char(36),
	amount numeric,
	reference varchar(10),
	created timestamp(6)
);


create table withdrawals (
  uuid char(36),
	user_uuid char(36),
	bank_account_uuid char(36),
	amount numeric,
	reference varchar(128),
	created timestamp(6)
);


create table transactions (
	uuid char(36),
	user_uuid char(36),
	beneficiary_uuid char(36),
	reference text,
	amount numeric,
	source_uuid char(36),
	created timestamp(6)
);
