import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

export const useNotifications = () => {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const pollRef = useRef(null)

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }

  const sendTestNotification = () => {
    if (permission !== 'granted') return
    new Notification('UniTrack Test 🎓', {
      body: 'Notifications are working correctly!',
      icon: '/favicon.svg',
    })
  }

  const pollDueReminders = async () => {
    if (permission !== 'granted') return
    try {
      const reminders = await api.reminders.list({ due: true })
      for (const reminder of reminders) {
        try {
          // Fetch deadline title for the notification body
          const deadline = await api.deadlines.get(reminder.deadline_id)
          new Notification(`Reminder: ${deadline.title}`, {
            body: deadline.deadline_date
              ? `Due: ${new Date(deadline.deadline_date).toLocaleDateString()}`
              : 'Check this deadline',
            icon: '/favicon.svg',
            tag: `reminder-${reminder.id}`,
          })
          await api.reminders.markSent(reminder.id)
        } catch (_) { /* noop for individual reminder failure */ }
      }
    } catch (_) { /* noop for poll failure */ }
  }

  useEffect(() => {
    if (permission !== 'granted') return
    pollDueReminders()
    pollRef.current = setInterval(pollDueReminders, 60_000)
    return () => clearInterval(pollRef.current)
  }, [permission])

  return { permission, requestPermission, sendTestNotification }
}
