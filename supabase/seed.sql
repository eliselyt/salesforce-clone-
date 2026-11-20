-- Demo data. Records are created without an owner; the first user to sign up
-- becomes admin and takes ownership of them (see handle_new_user).

insert into public.products (name, product_code, family, unit_price, description) values
  ('Meridian Sales Cloud – Starter',    'SAL-STR', 'Software', 25,    'Per user / month. Core CRM for small teams.'),
  ('Meridian Sales Cloud – Enterprise', 'SAL-ENT', 'Software', 150,   'Per user / month. Advanced forecasting and territories.'),
  ('Meridian Service Desk',             'SVC-DSK', 'Software', 90,    'Per agent / month. Case management and SLAs.'),
  ('Implementation Package',            'SRV-IMP', 'Services', 15000, 'Fixed-fee onboarding and data migration.'),
  ('Premier Support',                   'SUP-PRM', 'Support',  12000, 'Annual 24/7 support with a named engineer.'),
  ('Admin Certification Course',        'TRN-ADM', 'Training', 1800,  'Five-day instructor-led course.'),
  ('Edge Gateway Appliance',            'HW-EGW',  'Hardware', 4200,  'On-prem sync gateway.');

insert into public.campaigns (name, type, status, start_date, end_date, budgeted_cost, actual_cost, expected_revenue, description) values
  ('Q4 Product Webinar Series', 'webinar',    'in_progress', current_date - 30, current_date + 30, 20000, 12500, 400000, 'Monthly webinars on new releases.'),
  ('Dreamforce-style Summit',   'conference', 'planned',     current_date + 60, current_date + 63, 150000, null, 2000000, 'Annual customer conference.');

insert into public.accounts (name, type, industry, rating, website, phone, annual_revenue, number_of_employees, billing_city, billing_state, billing_country, description) values
  ('Acme Corporation',   'customer', 'Manufacturing',      'hot',  'https://acme.example',      '+1 415 555 0100', 120000000, 2400, 'San Francisco', 'CA', 'USA',       'Long-time customer, expanding to EMEA.'),
  ('Globex Industries',  'prospect', 'Energy',             'warm', 'https://globex.example',    '+1 212 555 0142', 560000000, 9100, 'New York',      'NY', 'USA',       null),
  ('Initech',            'customer', 'Technology',         'warm', 'https://initech.example',   '+1 512 555 0199', 45000000,  380,  'Austin',        'TX', 'USA',       'Uses Service Desk heavily.'),
  ('Umbrella Health',    'prospect', 'Healthcare',         'hot',  'https://umbrella.example',  '+65 6555 0123',   230000000, 5200, 'Singapore',     null, 'Singapore', 'Regional HQ in APAC.'),
  ('Stark Logistics',    'partner',  'Transportation',     'cold', 'https://stark.example',     '+44 20 5555 0110',88000000,  1200, 'London',        null, 'UK',        'Reseller partner.'),
  ('Wayne Financial',    'prospect', 'Financial Services', 'warm', 'https://wayne.example',     '+1 312 555 0177', 990000000, 15000,'Chicago',       'IL', 'USA',       null);

insert into public.contacts (account_id, salutation, first_name, last_name, title, email, phone, lead_source)
select a.id, c.salutation, c.first_name, c.last_name, c.title, c.email, c.phone, c.lead_source::public.lead_source
from (values
  ('Acme Corporation',  'Ms.', 'Olivia',  'Chen',     'VP of Sales',          'olivia.chen@acme.example',     '+1 415 555 0101', 'web'),
  ('Acme Corporation',  'Mr.', 'Marcus',  'Reed',     'IT Director',          'marcus.reed@acme.example',     '+1 415 555 0102', 'web'),
  ('Globex Industries', 'Dr.', 'Hannah',  'Okafor',   'Chief Digital Officer','h.okafor@globex.example',      '+1 212 555 0143', 'trade_show'),
  ('Initech',           'Mr.', 'Peter',   'Gibbons',  'Operations Manager',   'peter@initech.example',        '+1 512 555 0198', 'partner_referral'),
  ('Umbrella Health',   'Ms.', 'Priya',   'Raman',    'Head of Procurement',  'priya.raman@umbrella.example', '+65 6555 0124',   'webinar'),
  ('Umbrella Health',   'Mr.', 'Wei',     'Tan',      'CIO',                  'wei.tan@umbrella.example',     '+65 6555 0125',   'webinar'),
  ('Stark Logistics',   'Ms.', 'Amelia',  'Hart',     'Partner Manager',      'amelia@stark.example',         '+44 20 5555 0111','partner_referral'),
  ('Wayne Financial',   'Mr.', 'Lucius',  'Fox',      'CTO',                  'lfox@wayne.example',           '+1 312 555 0178', 'employee_referral')
) as c(account, salutation, first_name, last_name, title, email, phone, lead_source)
join public.accounts a on a.name = c.account;

insert into public.opportunities (name, account_id, contact_id, stage, amount, close_date, type, lead_source, next_step, closed_at)
select o.name, a.id, (select id from public.contacts where email = o.contact), o.stage::public.opportunity_stage, o.amount,
       current_date + o.days, o.type::public.opportunity_type, o.source::public.lead_source, o.next_step,
       case when o.stage in ('closed_won', 'closed_lost') then now() + make_interval(days => o.days) end
from (values
  ('Acme – EMEA Expansion',           'Acme Corporation',  'olivia.chen@acme.example',     'negotiation',       240000, 12,   'existing_business_upgrade', 'web',               'Legal review of MSA'),
  ('Acme – Premier Support Renewal',  'Acme Corporation',  'marcus.reed@acme.example',     'closed_won',        48000,  -20,  'existing_business_renewal', 'web',               null),
  ('Globex – Enterprise Rollout',     'Globex Industries', 'h.okafor@globex.example',      'proposal',          780000, 35,   'new_business',              'trade_show',        'Send revised pricing'),
  ('Initech – Service Desk Seats',    'Initech',           'peter@initech.example',        'closed_won',        64000,  -75,  'existing_business_upgrade', 'partner_referral',  null),
  ('Umbrella – APAC CRM Platform',    'Umbrella Health',   'priya.raman@umbrella.example', 'value_proposition', 410000, 48,   'new_business',              'webinar',           'Executive demo with CIO'),
  ('Umbrella – Implementation',       'Umbrella Health',   'wei.tan@umbrella.example',     'qualification',     90000,  60,   'new_business',              'webinar',           'Scope workshop'),
  ('Stark – Partner Edition',         'Stark Logistics',   'amelia@stark.example',         'closed_lost',       35000,  -40,  'new_business',              'partner_referral',  null),
  ('Wayne – Risk Analytics Pilot',    'Wayne Financial',   'lfox@wayne.example',           'prospecting',       150000, 21,   'new_business',              'employee_referral', 'Discovery call'),
  ('Initech – Training Bundle',       'Initech',           'peter@initech.example',        'closed_won',        18000,  -130, 'existing_business_upgrade', 'partner_referral',  null)
) as o(name, account, contact, stage, amount, days, type, source, next_step)
join public.accounts a on a.name = o.account;

insert into public.leads (salutation, first_name, last_name, company, title, email, phone, status, lead_source, industry, rating, annual_revenue, number_of_employees, city, country, campaign_id)
select l.salutation, l.first_name, l.last_name, l.company, l.title, l.email, l.phone, l.status::public.lead_status,
       l.source::public.lead_source, l.industry, l.rating::public.account_rating, l.revenue, l.employees, l.city, l.country,
       (select id from public.campaigns where name = 'Q4 Product Webinar Series' and l.source = 'webinar')
from (values
  ('Ms.', 'Sofia',   'Alvarez',  'Cyberdyne Systems', 'Director of IT',    'sofia@cyberdyne.example',  '+1 650 555 0131', 'new',       'web',             'Technology',     'hot',  75000000,  600,  'Palo Alto',  'USA'),
  ('Mr.', 'Kenji',   'Watanabe', 'Tyrell Robotics',   'COO',               'kenji@tyrell.example',     '+81 3 5555 0101', 'working',   'trade_show',      'Manufacturing',  'warm', 310000000, 2800, 'Tokyo',      'Japan'),
  ('Ms.', 'Aisha',   'Bello',    'Soylent Foods',     'Head of Sales Ops', 'aisha@soylent.example',    '+234 1 555 0101', 'nurturing', 'webinar',         'Retail',         'warm', 54000000,  900,  'Lagos',      'Nigeria'),
  ('Mr.', 'Daniel',  'Kim',      'Hooli',             'VP Engineering',    'dkim@hooli.example',       '+1 408 555 0155', 'qualified', 'employee_referral','Technology',    'hot',  820000000, 12000,'Mountain View','USA'),
  ('Ms.', 'Laura',   'Rossi',    'Vandelay Imports',  'Owner',             'laura@vandelay.example',   '+39 02 5555 0101','new',       'phone_inquiry',   'Retail',         'cold', 4000000,   35,   'Milan',      'Italy'),
  ('Mr.', 'Arjun',   'Mehta',    'Oscorp Labs',       'Procurement Lead',  'arjun@oscorp.example',     '+91 22 5555 0101','working',   'webinar',         'Biotechnology',  'warm', 140000000, 1500, 'Mumbai',     'India'),
  ('Ms.', 'Chloe',   'Martin',   'Massive Dynamic',   'CFO',               'chloe@massive.example',    '+33 1 5555 0101', 'unqualified','purchased_list', 'Engineering',    'cold', 260000000, 3300, 'Paris',      'France'),
  ('Mr.', 'Ethan',   'Lim',      'Pied Piper',        'Founder',           'ethan@piedpiper.example',  '+65 6555 0199',   'new',       'web',             'Technology',     'hot',  9000000,   60,   'Singapore',  'Singapore')
) as l(salutation, first_name, last_name, company, title, email, phone, status, source, industry, rating, revenue, employees, city, country);

insert into public.campaign_members (campaign_id, lead_id, status)
select c.id, l.id, 'responded' from public.campaigns c join public.leads l on l.campaign_id = c.id;

insert into public.cases (subject, description, status, priority, origin, type, reason, account_id, contact_id)
select s.subject, s.description, s.status::public.case_status, s.priority::public.case_priority, s.origin::public.case_origin,
       s.type, s.reason, a.id, (select id from public.contacts where email = s.contact)
from (values
  ('Sync errors after upgrade',     'Records fail to sync since v4.2.',          'working',   'high',     'email', 'Problem',         'Performance',  'Initech',          'peter@initech.example'),
  ('Request: SSO with Okta',        'Customer wants SAML SSO for all users.',     'new',       'medium',   'web',   'Feature Request', 'Feedback',     'Acme Corporation', 'marcus.reed@acme.example'),
  ('Invoice shows wrong seat count','Billed for 120 seats, contract says 100.',   'escalated', 'critical', 'phone', 'Billing',         'Other',        'Acme Corporation', 'olivia.chen@acme.example'),
  ('How to export reports?',        null,                                         'closed',    'low',      'chat',  'Question',        'Installation', 'Stark Logistics',  'amelia@stark.example')
) as s(subject, description, status, priority, origin, type, reason, account, contact)
join public.accounts a on a.name = s.account;

insert into public.activities (type, subject, status, priority, due_date, account_id, opportunity_id, contact_id)
select x.type::public.activity_type, x.subject, x.status::public.activity_status, x.priority::public.activity_priority,
       current_date + x.days, o.account_id, o.id, o.contact_id
from (values
  ('task',    'Send MSA redlines to legal',      'not_started', 'high',   1,  'Acme – EMEA Expansion'),
  ('call',    'Pricing discussion with Hannah',  'completed',   'normal', -3, 'Globex – Enterprise Rollout'),
  ('task',    'Prepare revised proposal',        'not_started', 'high',   -1, 'Globex – Enterprise Rollout'),
  ('meeting', 'Executive demo',                  'not_started', 'normal', 6,  'Umbrella – APAC CRM Platform'),
  ('task',    'Book discovery call',             'not_started', 'normal', 2,  'Wayne – Risk Analytics Pilot')
) as x(type, subject, status, priority, days, opp)
join public.opportunities o on o.name = x.opp;

insert into public.notes (title, body, opportunity_id, account_id)
select 'Champion', 'Olivia is the internal champion; procurement wants a 3-year term.', o.id, o.account_id
from public.opportunities o where o.name = 'Acme – EMEA Expansion';
