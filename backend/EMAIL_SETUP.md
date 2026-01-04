# Email Configuration for Mock Interviews

## Setup Instructions

To enable email notifications for mock interviews, configure SMTP settings in your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Common Email Providers

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Use App Password, not regular password
```
**Note:** You need to enable "Less secure app access" or use an App Password. Go to Google Account > Security > 2-Step Verification > App passwords.

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

### Custom SMTP Server
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=your-username
SMTP_PASSWORD=your-password
```

## Testing

Once configured, emails will be automatically sent when:
- A mock interview is created
- Emails go to all selected students
- Email goes to the assigned interviewer (faculty or external)

## Email Features

- ✅ Professional HTML email templates
- ✅ Responsive design
- ✅ Includes all interview details
- ✅ Meeting links or venue information
- ✅ Preparation tips for students
- ✅ Automatic formatting of dates and times

## Troubleshooting

If emails are not being sent:
1. Check that SMTP settings are correctly configured in `.env`
2. Verify SMTP credentials are correct
3. Check server logs for email errors
4. Ensure SMTP server allows connections from your server IP
5. For Gmail, ensure you're using an App Password, not your regular password

