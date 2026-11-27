ALTER TYPE public.citizen_verification_status
  RENAME VALUE 'Confirmed' TO 'Work Completed';

ALTER TYPE public.citizen_verification_status
  RENAME VALUE 'Not Done' TO 'Work Not Completed';

CREATE OR REPLACE FUNCTION public.sync_citizen_feedback_to_govt_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.issue_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public."GovtReport" AS government_report
  SET citizen_feedback = CASE
        WHEN feedback.has_not_fixed THEN 'not_fixed'
        WHEN feedback.reporter_count > 0
          AND feedback.fixed_reporter_count = feedback.reporter_count
          THEN 'fixed'
        ELSE NULL
      END,
      citizen_verification = CASE
        WHEN feedback.has_not_fixed
          THEN 'Work Not Completed'::public.citizen_verification_status
        WHEN feedback.reporter_count > 0
          AND feedback.fixed_reporter_count = feedback.reporter_count
          THEN 'Work Completed'::public.citizen_verification_status
        ELSE 'Pending'::public.citizen_verification_status
      END,
      verified_at = CASE
        WHEN NOT feedback.has_not_fixed
          AND feedback.reporter_count > 0
          AND feedback.fixed_reporter_count = feedback.reporter_count
          THEN pg_catalog.now()
        ELSE NULL
      END
  FROM (
    SELECT
      count(DISTINCT user_report.user_id)::integer AS reporter_count,
      count(DISTINCT user_report.user_id)
        FILTER (WHERE user_report.citizen_feedback = 'fixed')::integer
        AS fixed_reporter_count,
      coalesce(
        bool_or(user_report.citizen_feedback = 'not_fixed'),
        false
      ) AS has_not_fixed
    FROM public."UserReport" AS user_report
    WHERE user_report.issue_id = NEW.issue_id
  ) AS feedback
  WHERE government_report.report_id = NEW.issue_id;

  RETURN NEW;
END;
$function$;
