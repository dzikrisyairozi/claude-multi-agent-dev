-- Update seeded departments and positions to bilingual names (JP / EN)

-- Departments
UPDATE public.departments SET name = '経営企画部 / Corporate Planning', description = '経営戦略・事業計画の策定 / Management strategy and business planning' WHERE name = '経営企画部';
UPDATE public.departments SET name = '総務部 / General Affairs', description = '社内管理・庶務全般 / Internal administration and general affairs' WHERE name = '総務部';
UPDATE public.departments SET name = '人事部 / Human Resources', description = '採用・労務・人材開発 / Recruitment, labor, and talent development' WHERE name = '人事部';
UPDATE public.departments SET name = '経理部 / Accounting', description = '財務会計・経費管理 / Financial accounting and expense management' WHERE name = '経理部';
UPDATE public.departments SET name = '営業部 / Sales', description = '顧客開拓・売上管理 / Customer acquisition and revenue management' WHERE name = '営業部';
UPDATE public.departments SET name = 'マーケティング部 / Marketing', description = '市場分析・ブランド戦略 / Market analysis and brand strategy' WHERE name = 'マーケティング部';
UPDATE public.departments SET name = '開発部 / Engineering', description = 'ソフトウェア開発・技術研究 / Software development and technical research' WHERE name = '開発部';
UPDATE public.departments SET name = '情報システム部 / IT', description = '社内システム・インフラ管理 / Internal systems and infrastructure' WHERE name = '情報システム部';
UPDATE public.departments SET name = '法務部 / Legal', description = '契約管理・コンプライアンス / Contract management and compliance' WHERE name = '法務部';
UPDATE public.departments SET name = '品質管理部 / Quality Assurance', description = '品質保証・テスト管理 / Quality assurance and testing' WHERE name = '品質管理部';

-- Positions
UPDATE public.positions SET name = 'スタッフ / Staff', description = '一般社員 / General Employee' WHERE name = 'スタッフ';
UPDATE public.positions SET name = '主任 / Senior Staff', description = '主任・チーフ / Chief' WHERE name = '主任';
UPDATE public.positions SET name = '係長 / Section Chief', description = 'チームリーダー / Team Lead' WHERE name = '係長';
UPDATE public.positions SET name = '課長 / Manager', description = 'セクションマネージャー / Section Manager' WHERE name = '課長';
UPDATE public.positions SET name = '次長 / Deputy GM', description = '副部長 / Deputy General Manager' WHERE name = '次長';
UPDATE public.positions SET name = '部長 / General Manager', description = '部門長 / Department Head' WHERE name = '部長';
UPDATE public.positions SET name = '本部長 / Division Head', description = '事業本部長 / Executive General Manager' WHERE name = '本部長';
UPDATE public.positions SET name = '取締役 / Director', description = '役員 / Board Member' WHERE name = '取締役';
UPDATE public.positions SET name = '代表取締役 / CEO', description = '最高経営責任者 / Representative Director' WHERE name = '代表取締役';
