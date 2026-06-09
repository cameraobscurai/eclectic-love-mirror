#!/bin/bash
echo "--- Query 1: Recent unique emails ---"
psql -c "SELECT DISTINCT ON (message_id) message_id, template_name, recipient_email, status, error_message, created_at FROM email_send_log WHERE message_id IS NOT NULL ORDER BY message_id, created_at DESC LIMIT 50;"

echo -e "\n--- Query 2: Last 7 days status breakdown ---"
psql -c "SELECT status, count(*) FROM (SELECT DISTINCT ON (message_id) status FROM email_send_log WHERE message_id IS NOT NULL AND created_at > now() - interval '7 days' ORDER BY message_id, created_at DESC) x GROUP BY status;"

echo -e "\n--- Query 3: Queue config ---"
psql -c "SELECT * FROM email_send_state;"

echo -e "\n--- Query 4: Suppression check ---"
psql -c "SELECT * FROM suppressed_emails WHERE email_address ILIKE '%eclectichive%' OR email_address ILIKE 'info@%';"

echo -e "\n--- Query 5: Cron processor check ---"
psql -c "SELECT * FROM cron.job WHERE jobname LIKE '%email%';"

echo -e "\n--- Query 6: Inquiry stats ---"
psql -c "SELECT count(*), max(created_at) FROM inquiries;"

echo -e "\n--- Query 7: Recent inquiries ---"
psql -c "SELECT id, created_at, name, email, status FROM inquiries ORDER BY created_at DESC LIMIT 20;"

echo -e "\n--- Query 8: Cross-reference inquiries with email logs ---"
psql -c "SELECT i.id, i.created_at as inquiry_created, i.email as inquiry_email, e.status as email_status, e.created_at as email_logged_at, e.error_message FROM inquiries i LEFT JOIN (SELECT DISTINCT ON (recipient_email, created_at) * FROM email_send_log ORDER BY recipient_email, created_at DESC) e ON e.recipient_email = i.email AND e.created_at >= i.created_at - interval '1 minute' AND e.created_at <= i.created_at + interval '10 minutes' ORDER BY i.created_at DESC LIMIT 20;"
