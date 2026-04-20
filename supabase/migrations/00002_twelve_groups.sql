-- Migration 00002: 12-group FIFA 2026 format + knockout unlock pricing
-- All match times stored in UTC (source times are Guatemala GMT-6, i.e. +6h to get UTC)

-- ─── Schema updates ──────────────────────────────────────────────────────────

-- Allow r32 phase on matches (safe drop + re-add)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_phase_check;
ALTER TABLE matches ADD CONSTRAINT matches_phase_check
  CHECK (phase IN ('group','r32','r16','qf','sf','third','final'));

-- Add knockout unlock column to pools
ALTER TABLE pools ADD COLUMN IF NOT EXISTS knockout_unlocked boolean NOT NULL DEFAULT false;

-- Expand payment_status values and default to pending
ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_payment_status_check;
ALTER TABLE pools ADD CONSTRAINT pools_payment_status_check
  CHECK (payment_status IN ('none','pending','paid','declined','knockout_paid','business_paid'));

-- ─── Clear existing match data ────────────────────────────────────────────────

DELETE FROM matches;

-- ─── Group Stage Matches (72 total) ──────────────────────────────────────────
-- GROUP A: MEX, RSA, KOR, CZE

INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','A',1,'MEX','México','🇲🇽','RSA','Sudáfrica','🇿🇦','2026-06-11T19:00:00Z','Estadio Azteca, Ciudad de México','scheduled'),
('group','A',1,'KOR','Corea del Sur','🇰🇷','CZE','Rep. Checa','🇨🇿','2026-06-12T02:00:00Z','Estadio Akron, Guadalajara','scheduled'),
-- MD2
('group','A',2,'CZE','Rep. Checa','🇨🇿','RSA','Sudáfrica','🇿🇦','2026-06-18T16:00:00Z','Mercedes-Benz Stadium, Atlanta','scheduled'),
('group','A',2,'MEX','México','🇲🇽','KOR','Corea del Sur','🇰🇷','2026-06-19T01:00:00Z','Estadio Akron, Guadalajara','scheduled'),
-- MD3
('group','A',3,'CZE','Rep. Checa','🇨🇿','MEX','México','🇲🇽','2026-06-25T01:00:00Z','Estadio Azteca, Ciudad de México','scheduled'),
('group','A',3,'RSA','Sudáfrica','🇿🇦','KOR','Corea del Sur','🇰🇷','2026-06-25T01:00:00Z','Estadio BBVA, Monterrey','scheduled');

-- GROUP B: CAN, QAT, SUI, BIH
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','B',1,'CAN','Canadá','🇨🇦','BIH','Bosnia-Herzegovina','🇧🇦','2026-06-12T19:00:00Z','BMO Field, Toronto','scheduled'),
('group','B',1,'QAT','Qatar','🇶🇦','SUI','Suiza','🇨🇭','2026-06-13T19:00:00Z','Levi''s Stadium, Santa Clara','scheduled'),
-- MD2
('group','B',2,'SUI','Suiza','🇨🇭','BIH','Bosnia-Herzegovina','🇧🇦','2026-06-18T19:00:00Z','SoFi Stadium, Los Ángeles','scheduled'),
('group','B',2,'CAN','Canadá','🇨🇦','QAT','Qatar','🇶🇦','2026-06-18T22:00:00Z','BC Place, Vancouver','scheduled'),
-- MD3
('group','B',3,'SUI','Suiza','🇨🇭','CAN','Canadá','🇨🇦','2026-06-24T19:00:00Z','BC Place, Vancouver','scheduled'),
('group','B',3,'BIH','Bosnia-Herzegovina','🇧🇦','QAT','Qatar','🇶🇦','2026-06-24T19:00:00Z','Lumen Field, Seattle','scheduled');

-- GROUP C: BRA, MAR, SCO, HAI
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','C',1,'BRA','Brasil','🇧🇷','MAR','Marruecos','🇲🇦','2026-06-13T22:00:00Z','MetLife Stadium, East Rutherford','scheduled'),
('group','C',1,'HAI','Haití','🇭🇹','SCO','Escocia','🏴󠁧󠁢󠁳󠁣󠁴󠁿','2026-06-14T01:00:00Z','Gillette Stadium, Foxborough','scheduled'),
-- MD2
('group','C',2,'SCO','Escocia','🏴󠁧󠁢󠁳󠁣󠁴󠁿','MAR','Marruecos','🇲🇦','2026-06-19T22:00:00Z','Gillette Stadium, Foxborough','scheduled'),
('group','C',2,'BRA','Brasil','🇧🇷','HAI','Haití','🇭🇹','2026-06-20T01:00:00Z','Lincoln Financial Field, Philadelphia','scheduled'),
-- MD3
('group','C',3,'SCO','Escocia','🏴󠁧󠁢󠁳󠁣󠁴󠁿','BRA','Brasil','🇧🇷','2026-06-24T22:00:00Z','Hard Rock Stadium, Miami','scheduled'),
('group','C',3,'MAR','Marruecos','🇲🇦','HAI','Haití','🇭🇹','2026-06-24T22:00:00Z','Mercedes-Benz Stadium, Atlanta','scheduled');

-- GROUP D: USA, PAR, AUS, TUR
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','D',1,'USA','Estados Unidos','🇺🇸','PAR','Paraguay','🇵🇾','2026-06-13T01:00:00Z','SoFi Stadium, Los Ángeles','scheduled'),
('group','D',1,'AUS','Australia','🇦🇺','TUR','Türkiye','🇹🇷','2026-06-13T04:00:00Z','BC Place, Vancouver','scheduled'),
-- MD2
('group','D',2,'TUR','Türkiye','🇹🇷','PAR','Paraguay','🇵🇾','2026-06-20T04:00:00Z','Levi''s Stadium, Santa Clara','scheduled'),
('group','D',2,'USA','Estados Unidos','🇺🇸','AUS','Australia','🇦🇺','2026-06-19T19:00:00Z','Lumen Field, Seattle','scheduled'),
-- MD3
('group','D',3,'TUR','Türkiye','🇹🇷','USA','Estados Unidos','🇺🇸','2026-06-26T02:00:00Z','SoFi Stadium, Los Ángeles','scheduled'),
('group','D',3,'PAR','Paraguay','🇵🇾','AUS','Australia','🇦🇺','2026-06-26T02:00:00Z','Levi''s Stadium, Santa Clara','scheduled');

-- GROUP E: GER, CUW, CIV, ECU
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','E',1,'GER','Alemania','🇩🇪','CUW','Curaçao','🇨🇼','2026-06-14T17:00:00Z','NRG Stadium, Houston','scheduled'),
('group','E',1,'CIV','Costa de Marfil','🇨🇮','ECU','Ecuador','🇪🇨','2026-06-14T23:00:00Z','Lincoln Financial Field, Philadelphia','scheduled'),
-- MD2
('group','E',2,'GER','Alemania','🇩🇪','CIV','Costa de Marfil','🇨🇮','2026-06-20T20:00:00Z','BMO Field, Toronto','scheduled'),
('group','E',2,'ECU','Ecuador','🇪🇨','CUW','Curaçao','🇨🇼','2026-06-21T00:00:00Z','Arrowhead Stadium, Kansas City','scheduled'),
-- MD3
('group','E',3,'CUW','Curaçao','🇨🇼','CIV','Costa de Marfil','🇨🇮','2026-06-25T20:00:00Z','Lincoln Financial Field, Philadelphia','scheduled'),
('group','E',3,'ECU','Ecuador','🇪🇨','GER','Alemania','🇩🇪','2026-06-25T20:00:00Z','MetLife Stadium, East Rutherford','scheduled');

-- GROUP F: NED, JPN, SWE, TUN
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','F',1,'NED','Países Bajos','🇳🇱','JPN','Japón','🇯🇵','2026-06-14T20:00:00Z','AT&T Stadium, Arlington','scheduled'),
('group','F',1,'SWE','Suecia','🇸🇪','TUN','Túnez','🇹🇳','2026-06-15T02:00:00Z','Estadio BBVA, Monterrey','scheduled'),
-- MD2
('group','F',2,'NED','Países Bajos','🇳🇱','SWE','Suecia','🇸🇪','2026-06-20T17:00:00Z','NRG Stadium, Houston','scheduled'),
('group','F',2,'TUN','Túnez','🇹🇳','JPN','Japón','🇯🇵','2026-06-20T04:00:00Z','Estadio BBVA, Monterrey','scheduled'),
-- MD3
('group','F',3,'JPN','Japón','🇯🇵','SWE','Suecia','🇸🇪','2026-06-25T23:00:00Z','AT&T Stadium, Arlington','scheduled'),
('group','F',3,'TUN','Túnez','🇹🇳','NED','Países Bajos','🇳🇱','2026-06-25T23:00:00Z','Arrowhead Stadium, Kansas City','scheduled');

-- GROUP G: BEL, EGY, IRN, NZL
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','G',1,'BEL','Bélgica','🇧🇪','EGY','Egipto','🇪🇬','2026-06-15T19:00:00Z','Lumen Field, Seattle','scheduled'),
('group','G',1,'IRN','Irán','🇮🇷','NZL','Nueva Zelanda','🇳🇿','2026-06-16T01:00:00Z','SoFi Stadium, Los Ángeles','scheduled'),
-- MD2
('group','G',2,'BEL','Bélgica','🇧🇪','IRN','Irán','🇮🇷','2026-06-21T19:00:00Z','SoFi Stadium, Los Ángeles','scheduled'),
('group','G',2,'NZL','Nueva Zelanda','🇳🇿','EGY','Egipto','🇪🇬','2026-06-22T01:00:00Z','BC Place, Vancouver','scheduled'),
-- MD3
('group','G',3,'EGY','Egipto','🇪🇬','IRN','Irán','🇮🇷','2026-06-27T03:00:00Z','Lumen Field, Seattle','scheduled'),
('group','G',3,'NZL','Nueva Zelanda','🇳🇿','BEL','Bélgica','🇧🇪','2026-06-27T03:00:00Z','BC Place, Vancouver','scheduled');

-- GROUP H: ESP, URU, KSA, CPV
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','H',1,'ESP','España','🇪🇸','CPV','Cabo Verde','🇨🇻','2026-06-15T16:00:00Z','Mercedes-Benz Stadium, Atlanta','scheduled'),
('group','H',1,'KSA','Arabia Saudita','🇸🇦','URU','Uruguay','🇺🇾','2026-06-15T22:00:00Z','Hard Rock Stadium, Miami','scheduled'),
-- MD2
('group','H',2,'ESP','España','🇪🇸','KSA','Arabia Saudita','🇸🇦','2026-06-21T16:00:00Z','Mercedes-Benz Stadium, Atlanta','scheduled'),
('group','H',2,'URU','Uruguay','🇺🇾','CPV','Cabo Verde','🇨🇻','2026-06-21T22:00:00Z','Hard Rock Stadium, Miami','scheduled'),
-- MD3
('group','H',3,'CPV','Cabo Verde','🇨🇻','KSA','Arabia Saudita','🇸🇦','2026-06-27T00:00:00Z','NRG Stadium, Houston','scheduled'),
('group','H',3,'URU','Uruguay','🇺🇾','ESP','España','🇪🇸','2026-06-27T00:00:00Z','Estadio Akron, Guadalajara','scheduled');

-- GROUP I: FRA, SEN, NOR, IRQ
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','I',1,'FRA','Francia','🇫🇷','SEN','Senegal','🇸🇳','2026-06-16T19:00:00Z','MetLife Stadium, East Rutherford','scheduled'),
('group','I',1,'IRQ','Irak','🇮🇶','NOR','Noruega','🇳🇴','2026-06-16T22:00:00Z','Gillette Stadium, Foxborough','scheduled'),
-- MD2
('group','I',2,'FRA','Francia','🇫🇷','IRQ','Irak','🇮🇶','2026-06-22T21:00:00Z','Lincoln Financial Field, Philadelphia','scheduled'),
('group','I',2,'NOR','Noruega','🇳🇴','SEN','Senegal','🇸🇳','2026-06-23T00:00:00Z','MetLife Stadium, East Rutherford','scheduled'),
-- MD3
('group','I',3,'NOR','Noruega','🇳🇴','FRA','Francia','🇫🇷','2026-06-26T19:00:00Z','Gillette Stadium, Foxborough','scheduled'),
('group','I',3,'SEN','Senegal','🇸🇳','IRQ','Irak','🇮🇶','2026-06-26T19:00:00Z','BMO Field, Toronto','scheduled');

-- GROUP J: ARG, AUT, ALG, JOR
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','J',1,'ARG','Argentina','🇦🇷','ALG','Argelia','🇩🇿','2026-06-17T01:00:00Z','Arrowhead Stadium, Kansas City','scheduled'),
('group','J',1,'AUT','Austria','🇦🇹','JOR','Jordania','🇯🇴','2026-06-17T04:00:00Z','Levi''s Stadium, Santa Clara','scheduled'),
-- MD2
('group','J',2,'ARG','Argentina','🇦🇷','AUT','Austria','🇦🇹','2026-06-22T17:00:00Z','AT&T Stadium, Arlington','scheduled'),
('group','J',2,'JOR','Jordania','🇯🇴','ALG','Argelia','🇩🇿','2026-06-23T03:00:00Z','Levi''s Stadium, Santa Clara','scheduled'),
-- MD3
('group','J',3,'JOR','Jordania','🇯🇴','ARG','Argentina','🇦🇷','2026-06-28T02:00:00Z','AT&T Stadium, Arlington','scheduled'),
('group','J',3,'ALG','Argelia','🇩🇿','AUT','Austria','🇦🇹','2026-06-28T02:00:00Z','Arrowhead Stadium, Kansas City','scheduled');

-- GROUP K: POR, COL, COD, UZB
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','K',1,'POR','Portugal','🇵🇹','COD','DR Congo','🇨🇩','2026-06-17T17:00:00Z','NRG Stadium, Houston','scheduled'),
('group','K',1,'UZB','Uzbekistán','🇺🇿','COL','Colombia','🇨🇴','2026-06-18T02:00:00Z','Estadio Azteca, Ciudad de México','scheduled'),
-- MD2
('group','K',2,'POR','Portugal','🇵🇹','UZB','Uzbekistán','🇺🇿','2026-06-23T17:00:00Z','NRG Stadium, Houston','scheduled'),
('group','K',2,'COL','Colombia','🇨🇴','COD','DR Congo','🇨🇩','2026-06-24T02:00:00Z','Estadio Akron, Guadalajara','scheduled'),
-- MD3
('group','K',3,'COL','Colombia','🇨🇴','POR','Portugal','🇵🇹','2026-06-27T23:30:00Z','Hard Rock Stadium, Miami','scheduled'),
('group','K',3,'COD','DR Congo','🇨🇩','UZB','Uzbekistán','🇺🇿','2026-06-27T23:30:00Z','Mercedes-Benz Stadium, Atlanta','scheduled');

-- GROUP L: ENG, CRO, GHA, PAN
INSERT INTO matches (phase, group_name, matchday, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, match_date, stadium, status) VALUES
-- MD1
('group','L',1,'ENG','Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿','CRO','Croacia','🇭🇷','2026-06-17T20:00:00Z','AT&T Stadium, Arlington','scheduled'),
('group','L',1,'GHA','Ghana','🇬🇭','PAN','Panamá','🇵🇦','2026-06-17T23:00:00Z','BMO Field, Toronto','scheduled'),
-- MD2
('group','L',2,'ENG','Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿','GHA','Ghana','🇬🇭','2026-06-23T20:00:00Z','Gillette Stadium, Foxborough','scheduled'),
('group','L',2,'PAN','Panamá','🇵🇦','CRO','Croacia','🇭🇷','2026-06-23T23:00:00Z','BMO Field, Toronto','scheduled'),
-- MD3
('group','L',3,'PAN','Panamá','🇵🇦','ENG','Inglaterra','🏴󠁧󠁢󠁥󠁮󠁧󠁿','2026-06-27T21:00:00Z','MetLife Stadium, East Rutherford','scheduled'),
('group','L',3,'CRO','Croacia','🇭🇷','GHA','Ghana','🇬🇭','2026-06-27T21:00:00Z','Lincoln Financial Field, Philadelphia','scheduled');

-- ─── Knockout Shell Rows ──────────────────────────────────────────────────────
-- R32 (16 matches, slots 0-15, teams TBD after group stage)
INSERT INTO matches (phase, slot, match_date, status) VALUES
('r32',0,'2026-07-01T00:00:00Z','scheduled'),
('r32',1,'2026-07-01T04:00:00Z','scheduled'),
('r32',2,'2026-07-02T00:00:00Z','scheduled'),
('r32',3,'2026-07-02T04:00:00Z','scheduled'),
('r32',4,'2026-07-03T00:00:00Z','scheduled'),
('r32',5,'2026-07-03T04:00:00Z','scheduled'),
('r32',6,'2026-07-04T00:00:00Z','scheduled'),
('r32',7,'2026-07-04T04:00:00Z','scheduled'),
('r32',8,'2026-07-05T00:00:00Z','scheduled'),
('r32',9,'2026-07-05T04:00:00Z','scheduled'),
('r32',10,'2026-07-06T00:00:00Z','scheduled'),
('r32',11,'2026-07-06T04:00:00Z','scheduled'),
('r32',12,'2026-07-07T00:00:00Z','scheduled'),
('r32',13,'2026-07-07T04:00:00Z','scheduled'),
('r32',14,'2026-07-08T00:00:00Z','scheduled'),
('r32',15,'2026-07-08T04:00:00Z','scheduled');

-- R16 (8 matches, slots 0-7)
INSERT INTO matches (phase, slot, match_date, status) VALUES
('r16',0,'2026-07-11T00:00:00Z','scheduled'),
('r16',1,'2026-07-11T04:00:00Z','scheduled'),
('r16',2,'2026-07-12T00:00:00Z','scheduled'),
('r16',3,'2026-07-12T04:00:00Z','scheduled'),
('r16',4,'2026-07-13T00:00:00Z','scheduled'),
('r16',5,'2026-07-13T04:00:00Z','scheduled'),
('r16',6,'2026-07-14T00:00:00Z','scheduled'),
('r16',7,'2026-07-14T04:00:00Z','scheduled');

-- QF (4 matches, slots 0-3)
INSERT INTO matches (phase, slot, match_date, status) VALUES
('qf',0,'2026-07-17T23:00:00Z','scheduled'),
('qf',1,'2026-07-18T03:00:00Z','scheduled'),
('qf',2,'2026-07-19T23:00:00Z','scheduled'),
('qf',3,'2026-07-20T03:00:00Z','scheduled');

-- SF (2 matches, slots 0-1)
INSERT INTO matches (phase, slot, match_date, status) VALUES
('sf',0,'2026-07-23T23:00:00Z','scheduled'),
('sf',1,'2026-07-25T23:00:00Z','scheduled');

-- Third place and Final
INSERT INTO matches (phase, slot, match_date, status) VALUES
('third',0,'2026-07-29T19:00:00Z','scheduled'),
('final',0,'2026-07-30T23:00:00Z','scheduled');
