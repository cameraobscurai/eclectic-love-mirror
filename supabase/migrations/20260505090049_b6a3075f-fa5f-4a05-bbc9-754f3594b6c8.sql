
UPDATE inventory_items SET status='draft', updated_at=now() WHERE rms_id='3910';

UPDATE inventory_items SET images=ARRAY['https://images.squarespace-cdn.com/content/v1/57239bd5f8baf385ff553066/1643819539687-HAC2ZE4J3EIQURV641AM/HONEY+Red+Wine.png'], updated_at=now() WHERE rms_id='2722';
UPDATE inventory_items SET images=ARRAY['https://images.squarespace-cdn.com/content/v1/57239bd5f8baf385ff553066/1643819544204-IF49O2ERWKFULEZGRE88/HONEY+White+Wine.png'], updated_at=now() WHERE rms_id='2721';
UPDATE inventory_items SET images=ARRAY['https://images.squarespace-cdn.com/content/v1/57239bd5f8baf385ff553066/1643819548807-9IW0T91EI56BT5RSIPX3/HONEY+Stemless.png'], updated_at=now() WHERE rms_id='2724';
UPDATE inventory_items SET images=ARRAY['https://images.squarespace-cdn.com/content/v1/57239bd5f8baf385ff553066/1643819553874-RYNIIY8RMFVXLZBG87WA/HONEY+Coupe.png'], updated_at=now() WHERE rms_id='2723';
