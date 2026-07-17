# ProjectPacket

ProjectPacket is a lightweight client asset collection tool for freelancers and small creative agencies.

Instead of chasing clients through email for logos, copy, photos, links, brand colors, files, and approvals, freelancers can create one organized packet and send the client a single upload link.

**Live app:** https://www.projectpacket.site

## The Problem

Creative projects often get delayed before the real work even begins. Important materials are scattered across emails, cloud drives, and messages. It becomes difficult to know what the client has submitted and what is still missing.

ProjectPacket keeps the entire collection and review process in one place without becoming a full project management platform.

## How It Works

1. The freelancer creates a packet for a client project.
2. They choose a template or create their own checklist.
3. ProjectPacket generates a private client link.
4. The client opens the link without creating an account.
5. The client uploads files, pastes text, adds links, leaves comments, or confirms approvals.
6. The freelancer reviews each submission.
7. Items can be approved, marked as needing changes, or waived.
8. Both sides can see what is complete and what is still needed.

## Features

- Freelancer signup and login with Supabase Auth
- Dashboard showing active packets and items that need attention
- Searchable and filterable packet list
- Custom packet creation
- Reusable checklist templates
- Starter templates for websites, branding, social media, and video projects
- File, text, link, and approval request types
- Visual color swatches for submitted hex colors
- Account-free client upload portal
- Mobile-friendly client submission flow
- File previews and secure downloads
- Client comments
- Item approval and change requests
- Waived checklist items
- Packet progress tracking
- Activity history with exact timestamps
- Optional client-link passcodes
- Optional link expiration dates
- Email invitations and reminders when Resend is configured
- Free and paid-plan limits

## Item Statuses

Each requested item moves through a small set of clear states:

- **Missing:** The client has not submitted the item.
- **Submitted:** The item is ready for freelancer review.
- **Approved:** The freelancer accepted the submission.
- **Needs changes:** The client needs to revise or replace it.
- **Waived:** The item is no longer required.

## Client-Link Security

Clients do not need accounts. Each packet uses a long, unguessable share token instead of a predictable project ID.

Packet owners can also add a passcode or expiration date. Passcodes are stored as hashes rather than plain text. Uploaded files are stored in a private Supabase Storage bucket and opened through signed URLs.

Supabase Row Level Security keeps freelancer data separated by account. Public client access goes through server routes that validate the packet token, passcode, expiration, request type, and submitted data.

This is still an MVP. It includes basic file validation, but it does not currently include malware scanning or enterprise security controls.

## Technology

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- lucide-react
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Resend for optional client emails
- Vercel for deployment

## Run Locally

Clone the repository and install the dependencies:

```bash
git clone https://github.com/olinho11/ProjectPacket.git
cd ProjectPacket
npm install
```

Create your local environment file:

```bash
cp .env.local.example .env.local
```

Add the required values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY=

# Optional email support
RESEND_API_KEY=
EMAIL_FROM=
```

Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` in a public environment variable.

## Configure Supabase

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase-schema.sql`.
4. Confirm that the `projectpacket-files` Storage bucket was created.
5. Add your Supabase URL, publishable key, and service-role key to `.env.local`.
6. Enable your preferred Supabase authentication settings.
7. Restart the development server after changing environment variables.

Start the app:

```bash
npm run dev
```

Open the local URL shown by Next.js, usually `http://localhost:3000`.

## Available Commands

```bash
npm run dev        # Start the development server
npm run build      # Create a production build
npm run lint       # Run Next.js linting
npm run typecheck  # Check TypeScript types
```

## What To Test

1. Sign up and log in.
2. Create a packet from a template.
3. Add or edit checklist items.
4. Copy the generated client link.
5. Open the link in a private browser window.
6. Submit a file, text answer, link, color, comment, and approval.
7. Return to the freelancer packet page.
8. Preview or download the uploaded file.
9. Approve one item.
10. Request changes on another item.
11. Waive an unnecessary item.
12. Refresh the client portal and confirm every status is visible.
13. Test an optional passcode and expiration date.
14. Confirm the packet progress and activity history update.

## Current Limitations

ProjectPacket is an MVP. Stripe checkout is not connected yet, so pricing and plan pages currently demonstrate the intended billing structure. Email sending requires valid Resend credentials. Uploads have basic safety checks but no malware scanner. Team accounts, advanced branding, and comment threads are not implemented yet.

ProjectPacket is intentionally not a CRM or full project management system. It focuses on one job: collecting the materials needed before creative work can move forward.

## AI USAGE DECLARATION
I used Codex to help plan and build ProjectPacket. It made and edited parts of the Next.js and Supabase code and UI, helped debug errors, ran tests, and helped with the design.
