drop table if exists users;
create table users (
  uuid char(36) primary key,
	firstname varchar(128),
	lastname varchar(128),
	mobile_number varchar(20) unique,
	email_address varchar(128) unique,
	modified timestamp(6),
	created timestamp(6)
);

drop table if exists user_passwords;
create table user_passwords (
  uuid char(36) primary key,
  user_uuid char(36) unique,
	password text,
	salt text,
	modified timestamp(6),
	created timestamp(6)
);

drop table if exists user_pins;
create table user_pins (
  uuid char(36) primary key,
  user_uuid char(36) unique,
	pin text,
	salt text,
	modified timestamp(6),
	created timestamp(6)
);

drop table if exists accounts;
create table accounts (
  uuid char(36) primary key,
	user_uuid char(36),
	name varchar(128),
	address varchar(60),
	private_key text,
	mnemonic text,
	password text,
	encr_key text,
	account_type varchar(36),
	created timestamp(6)
);

drop table if exists beneficiaries;
create table beneficiaries (
  uuid char(36) primary key,
	user_uuid char(36),
	beneficiary_user_uuid varchar(36),
	name varchar(128),
	mobile_number varchar(20),
	email_address varchar(128),
	account_address varchar(64),
	reference varchar(128),
	created timestamp(6)
);

drop table if exists banks;
create table banks (
	uuid char(36) primary key,
	name varchar(128),
	branch_code varchar(16),
	created timestamp(6)
);


drop table if exists bank_account_types;
create table bank_account_types (
	uuid char(36) primary key,
	account_type varchar(128),
	created timestamp(6)
);

drop table if exists bank_accounts;
create table bank_accounts (
  uuid char(36) primary key,
	user_uuid char(36),
	bank_uuid char(36),
	name varchar(128),
	full_name varchar(128),
	account_number varchar(32),
	account_type_uuid char(36),
	kyc_approved boolean,
	created timestamp(6)
);

drop table if exists kyc;
create table kyc (
  uuid char(36) primary key,
	user_uuid char(36) unique,
	kyc_level numeric,
	kyc_level_uuid char(36),
	modified timestamp(6),
	created timestamp(6)
);

drop table if exists kyc_levels;
create table kyc_levels (
	uuid char(36) primary key,
	name varchar(32),
	deposits boolean,
	min_deposit numeric,
	max_deposit numeric,
	withdrawals boolean,
	min_withdrawal numeric,
	max_withdrawal numeric,
	created timestamp(6)
);

drop table if exists kyc_documents;
create table kyc_documents (
  uuid char(36) primary key,
	user_uuid char(36),
	kyc_uuid char(36),
	account_uuid char(36),
	document_type_uuid text,
	document_path text,
	created timestamp(6)
);

drop table if exists document_types;
create table document_types (
  uuid char(36) primary key,
	document_type varchar(128),
	created timestamp(6)
);

drop table if exists otp;
create table otp (
  uuid char(36) primary key,
	user_uuid char(36),
	token varchar(10),
	sent boolean,
	sent_time timestamp(6),
	validated boolean,
	validated_time timestamp(6),
	created timestamp(6),
	modified timestamp(6)
);

drop table if exists payments;
create table payments (
  uuid char(36) primary key,
	user_uuid char(36),
	account_uuid char(36),
	beneficiary_uuid char(36),
	amount numeric,
	asset_id char(14),
	reference varchar(128),
	processed boolean,
	processed_time timestamp(6),
	processed_result text,
	created timestamp(6)
);

drop table if exists payment_notifications;
create table payment_notifications (
	uuid char(36) primary key,
	payment_uuid char(36),
	user_uuid char(36),
	notification_channel_uuid char(36),
	type varchar(50),
	created timestamp(6)
);

drop table if exists notification_channels;
create table notification_channels (
	uuid char(36) primary key,
	description varchar(32),
	created timestamp(6)
);

drop table if exists deposit_details;
create table deposit_details (
	uuid char(36) primary key,
	bank_name varchar(128),
	account_number varchar(16),
	branch_code varchar(16),
	account_type_uuid char(36),
	created timestamp(6),
	modified timestamp(6)
);

drop table if exists deposit_references;
create table deposit_references (
  uuid char(36) primary key,
	user_uuid char(36) unique,
	reference varchar(10),
	created timestamp(6)
);

drop table if exists deposits;
create table deposits (
  uuid char(36) primary key,
	user_uuid char(36),
	account_uuid char(36),
	amount numeric,
	reference varchar(10),
	created timestamp(6)
);

drop table if exists withdrawals;
create table withdrawals (
  uuid char(36) primary key,
	user_uuid char(36),
	bank_account_uuid char(36),
	amount numeric,
	reference varchar(128),
	created timestamp(6)
);

drop table if exists transactions;
create table transactions (
	uuid char(36) primary key,
	user_uuid char(36),
	reference text,
	amount numeric,
	source_uuid char(36),
	type varchar(50),
	created timestamp(6)
);

drop table if exists assets;
create table assets (
	uuid char(36) primary key,
	user_uuid char(36),
	name varchar(50),
	symbol varchar(6),
	total_supply varchar(50),
	minting_address_uuid char(36),
	mintable boolean,
	owner_burnable boolean,
	holder_burnable boolean,
	from_burnable boolean,
	freezable boolean,
	issued boolean,
	issue_response text,
	asset_id char(14),
	created timestamp(6),
	modified timestamp(6)
);

drop table if exists mint_requests;
create table mint_requests (
	uuid char(36) primary key,
	user_uuid char(36),
	asset_uuid char(36),
	amount numeric,
  recipient_address varchar(64),
	recipient_address varchar(64),
	processed boolean,
	processed_time timestamp(6),
	processed_result text,
	created timestamp(6),
	modified timestamp(6)
);

drop table if exists burn_requests;
create table burn_requests (
	uuid char(36) primary key,
	user_uuid char(36),
	asset_uuid char(36),
	amount numeric,
  recipient_address varchar(64),
	recipient_address varchar(64),
	processed boolean,
	processed_time timestamp(6),
	processed_result text,
	created timestamp(6),
	modified timestamp(6)
);



insert into banks (uuid, name, branch_code, created) values
(md5(random()::text || clock_timestamp()::text)::uuid, 'ABSA', '632005', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Capitec Bank', '470 010', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'First National Bank', '250655', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Nedbank', '198765', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Standard Bank', '051001', now());


insert into bank_account_types (uuid, account_type, created) values
(md5(random()::text || clock_timestamp()::text)::uuid, 'Current/Cheque', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Savings', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Credit', now());


insert into kyc_levels (uuid, name, deposits, min_deposit, max_deposit, withdrawals, min_withdrawal, max_withdrawal, created) values
(md5(random()::text || clock_timestamp()::text)::uuid, 'Level 1', false, 0, 0, false, 0, 0, now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Level 2', true, 0, 1000, false, 0, 0, now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Level 3', true, 0, null, true, 0, null, now());


insert into document_types (uuid, document_type, created) values
(md5(random()::text || clock_timestamp()::text)::uuid, 'Identification Document', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Proof of Address', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'Proof of Bank', now());


insert into notification_channels (uuid, description, created) values
(md5(random()::text || clock_timestamp()::text)::uuid, 'Email', now()),
(md5(random()::text || clock_timestamp()::text)::uuid, 'SMS', now());


insert into deposit_details (uuid, bank_name, account_number, branch_code, account_type_uuid, created) values
(md5(random()::text || clock_timestamp()::text)::uuid, 'Rand Merchant Bank', '1234567890', '261251', (select uuid from bank_account_types where account_type = 'Current/Cheque'), now());
