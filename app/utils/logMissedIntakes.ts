import { supabase } from '../../lib/supabase';

export const logMissedIntakes = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    // Fetch all reminders for the user
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id);

    if (remindersError || !reminders) return;

    const now = new Date();

    for (const reminder of reminders) {
      const scheduled = new Date(reminder.scheduled_time);
      const oneMinuteAfter = new Date(scheduled.getTime() + 60 * 1000);

      // Skip if intake already exists
      const { data: intakeExisting } = await supabase
        .from('intake')
        .select('*')
        .eq('reminder_id', reminder.id)
        .maybeSingle();
      if (intakeExisting) continue;

      // Skip if already logged as missed
      const { data: missedExisting } = await supabase
        .from('missed_intake')
        .select('*')
        .eq('reminder_id', reminder.id)
        .maybeSingle();
      if (missedExisting) continue;

      // If scheduled + 1 minute has passed, insert as missed
      if (now >= oneMinuteAfter) {
        const malaysiaTimeISO = new Date(Date.now() + 8 * 60 * 60 * 1000)
          .toISOString()
          .replace('Z', '+08:00');

        const { error: insertError } = await supabase
          .from('missed_intake')
          .insert({
            user_id: user.id,
            reminder_id: reminder.id,
            medicine_name: reminder.medicine_name,
            scheduled_time: reminder.scheduled_time,
            missed_time: malaysiaTimeISO,
          });

        if (insertError) {
          console.error("Failed to insert missed intake:", insertError);
          continue;
        }

        console.log(`Missed intake logged for ${reminder.medicine_name}`);
      }
    }
  } catch (err) {
    console.error("Error logging missed intakes:", err);
  }
};
