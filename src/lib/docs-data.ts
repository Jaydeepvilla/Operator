import { Settings, MessageSquare, Inbox, Brain, Calendar } from "lucide-react";

export const SIDEBAR = [
  {
    "section": "Getting Started",
    "icon": Settings,
    "items": [
      { "id": "account-setup", "label": "Account Setup" },
      { "id": "business-profile", "label": "Business Profile" }
    ]
  },
  {
    "section": "Channels",
    "icon": MessageSquare,
    "items": [
      { "id": "connect-whatsapp", "label": "Meta WhatsApp" },
      { "id": "connect-sms", "label": "Twilio SMS" },
      { "id": "connect-email", "label": "Email" },
      { "id": "connect-instagram", "label": "Instagram" }
    ]
  },
  {
    "section": "Inbox",
    "icon": Inbox,
    "items": [
      { "id": "view-messages", "label": "Viewing Messages" },
      { "id": "manage-leads", "label": "Managing Leads" }
    ]
  },
  {
    "section": "Knowledge Base",
    "icon": Brain,
    "items": [
      { "id": "add-documents", "label": "Uploading Documents" }
    ]
  },
  {
    "section": "Appointments",
    "icon": Calendar,
    "items": [
      { "id": "view-appointments", "label": "Viewing Appointments" },
      { "id": "services-menu", "label": "Services Menu" }
    ]
  }
];

export const DOC_CONTENT: Record<string, { title: string; description: string; content: string; code?: string; toc?: { id: string; title: string; level: number }[] }> = {
  "account-setup": {
    "title": "Account Setup",
    "description": "Configure your basic account details and preferences.",
    "toc": [],
    "content": "# Overview\n\nAccount setup is where you configure Operator AI with your company details. This ensures Operator AI gives your customers correct information about your business from day one.\n\n# Before You Begin\n\nHave your business name, contact email, phone number, and physical address ready.\n\n# Step-by-Step Instructions\n\n## Step 1: Start Setup\n\nClick **Get Started** on the home page.\n\nYou should now see the welcome screen.\n\n## Step 2: Select Industry\n\nClick the card that best matches your business type.\n\nClick **Continue**.\n\n## Step 3: Enter Business Details\n\nFill in:\n- Business Name\n- Contact Email\n- Contact Phone\n- Physical Address\n\nSelect your timezone from the dropdown.\n\nClick **Launch Workspace**.\n\n# What Happens Next\n\nYour business profile is now ready.\n\nOperator AI will use this information when answering customer questions about where you are located or how to contact you.\n\n# Tips\n\n- Use the phone number you want customers to actually call.\n- Double-check your timezone so appointments are scheduled correctly.\n\n# Common Problems\n\n**Problem:** The system says my email is invalid.\n\n**Reason:** You might have added a space at the end of the email address.\n\n**Solution:** Check for spaces and make sure you included the \"@\" symbol.\n\n# Frequently Asked Questions\n\n**Can I change this later?**\nYes. You can update all of these details anytime from the Business Profile page in your dashboard."
  },
  "business-profile": {
    "title": "Business Profile",
    "description": "Update your company name, location, and contact information.",
    "toc": [],
    "content": "# Overview\n\nYour business profile contains the core details that Operator AI uses to answer common questions like \"Where are you located?\" or \"What is your phone number?\".\n\n# Before You Begin\n\nHave your correct address, contact email, phone number, and social media links ready.\n\n# Step-by-Step Instructions\n\n## Step 1: Open Business Profile\n\nClick **Profile** from the left menu.\n\nYou should now see the Business Profile settings.\n\n## Step 2: Update Core Information\n\nFill in:\n- Business Name\n- Business Bio / Description\n- Support/Contact Email\n- Contact Phone Number\n- Website Link\n- Physical Location Address\n- Timezone\n\n## Step 3: Add Review Links\n\nScroll down to the **Google Maps & Review Settings** section.\n\nEnter your Google Maps link and your Google Review Submission link.\n\n## Step 4: Add Social Media\n\nScroll down to the **Social Profile Coordinates** section.\n\nPaste the links to your Facebook, Twitter, Instagram, or LinkedIn pages.\n\n## Step 5: Save Changes\n\nClick **Save Business Profile**.\n\n# What Happens Next\n\nYour profile is immediately updated across the system.\n\nOperator AI will instantly start using this new information to answer customer questions accurately, and can provide your review links or social media handles when asked."
  },
  "connect-whatsapp": {
    "title": "Meta WhatsApp Business",
    "description": "Allow Operator AI to talk to customers on WhatsApp.",
    "toc": [],
    "content": "# Overview\n\nConnecting WhatsApp allows Operator AI to answer questions and book appointments directly through the world's most popular messaging app.\n\n# Step-by-Step Instructions\n\n## Step 1: Go to Channels\n\nClick **Channels** in the left menu.\n\n## Step 2: Connect WhatsApp\n\nLocate the **Meta WhatsApp Business** card and click **Connect API**.\n\n## Step 3: Enter Your Details\n\nFill in the required information for your WhatsApp Business account:\n- Integration Label (e.g., \"Main WhatsApp Line\")\n- Phone Number ID\n- WhatsApp Business Account ID\n- Meta System User Access Token\n\n## Step 4: Save\n\nClick **Save Pipeline**.\n\n# Customize Your AI\n\nOnce connected, click **Settings** on the WhatsApp card to adjust how Operator AI behaves:\n\n- **Enable AI Autopilot:** Turn this on to let Operator AI reply automatically. Turn it off if you want to reply manually from the Inbox.\n- **Conversation Tone:** Choose how Operator AI sounds (Professional, Friendly, Empathetic, or Casual).\n- **Only Business Hours:** Turn this on if you only want Operator AI to reply during your open hours."
  },
  "connect-sms": {
    "title": "Twilio SMS",
    "description": "Allow Operator AI to reply to text messages.",
    "toc": [],
    "content": "# Overview\n\nBy connecting your phone number, Operator AI can reply to text messages sent by your customers.\n\n# Step-by-Step Instructions\n\n## Step 1: Go to Channels\n\nClick **Channels** in the left menu.\n\n## Step 2: Connect SMS\n\nLocate the **Twilio SMS Core** card and click **Connect Twilio**.\n\n## Step 3: Enter Your Details\n\nFill in your Twilio account information:\n- Integration Label (e.g., \"Support Text Line\")\n- Twilio Account SID\n- Twilio Auth Token\n- Twilio Phone Number\n\n## Step 4: Save\n\nClick **Save Pipeline**.\n\n# Customize Your AI\n\nOnce connected, click **Settings** on the SMS card to adjust how Operator AI behaves:\n\n- **Enable AI Autopilot:** Turn this on to let Operator AI reply automatically. Turn it off if you want to reply manually from the Inbox.\n- **Conversation Tone:** Choose how Operator AI sounds (Professional, Friendly, Empathetic, or Casual).\n- **Response Delay:** Add a short delay (in seconds) before Operator AI replies so it feels more natural.\n- **Only Business Hours:** Turn this on if you only want Operator AI to reply during your open hours."
  },
  "connect-email": {
    "title": "Email Setup",
    "description": "Allow Operator AI to handle incoming emails.",
    "toc": [],
    "content": "# Overview\n\nConnect your business email address so Operator AI can automatically read, process, and reply to customer emails.\n\n# Step-by-Step Instructions\n\n## Step 1: Go to Channels\n\nClick **Channels** in the left menu.\n\n## Step 2: Connect Email\n\nLocate the **SMTP / Gmail / M365 Email** card and click **Connect Host**.\n\n## Step 3: Enter Your Details\n\nFill in your email server information:\n- Integration Label (e.g., \"Support Email\")\n- SMTP Host Server (e.g., smtp.gmail.com)\n- SMTP Port (usually 587)\n- Username / Account Email\n- Password (or App Password)\n\n## Step 4: Save\n\nClick **Save Pipeline**.\n\n# Customize Your AI\n\nOnce connected, click **Settings** on the Email card to choose Operator AI's tone of voice and decide if it should reply to every email automatically."
  },
  "connect-instagram": {
    "title": "Instagram Direct",
    "description": "Allow Operator AI to answer Instagram direct messages.",
    "toc": [],
    "content": "# Overview\n\nConnect your Instagram account so Operator AI can answer questions from your followers and help them book appointments directly in their DMs.\n\n# Step-by-Step Instructions\n\n## Step 1: Go to Channels\n\nClick **Channels** in the left menu.\n\n## Step 2: Connect Instagram\n\nLocate the **Instagram DM Channel** card and click **Connect Page**.\n\n## Step 3: Enter Your Details\n\nFill in your account information:\n- Integration Label (e.g., \"Main Instagram\")\n- Facebook Page ID\n- Instagram Business Account ID\n- Facebook Page Access Token\n\n## Step 4: Save\n\nClick **Save Pipeline**.\n\n# Customize Your AI\n\nOnce connected, click **Settings** on the Instagram card to adjust Operator AI's tone of voice and choose if it should reply automatically."
  },
  "view-messages": {
    "title": "Viewing Messages",
    "description": "Read and reply to customer conversations.",
    "toc": [],
    "content": "# Overview\n\nThe Inbox is where you can see every conversation happening across all your connected channels (WhatsApp, SMS, Email, Instagram). You can read what Operator AI is saying, or step in to reply yourself.\n\n# Step-by-Step Instructions\n\n## Step 1: Open the Inbox\n\nClick **Inbox** from the left menu.\n\n## Step 2: Find a Conversation\n\nOn the left side of the screen, you will see a list of all recent conversations. You can:\n- Click on any conversation to read it.\n- Use the search bar to find a specific customer by name.\n- Use the filter button to only see messages from a specific channel (like only WhatsApp messages).\n\n## Step 3: Reply to a Customer\n\nWhen looking at a conversation, you will see the chat history in the middle of the screen.\n\nTo send a message yourself:\n1. Type your message in the box at the bottom.\n2. Press Enter or click **Send**.\n\n## Step 4: Add Internal Notes\n\nIf you want to leave a note for yourself or your team that the customer cannot see:\n1. Click the **Internal Note** button above the typing box.\n2. Type your note.\n3. Click **Log Note**."
  },
  "manage-leads": {
    "title": "Managing Leads",
    "description": "Update customer details and track their status.",
    "toc": [],
    "content": "# Overview\n\nAs Operator AI talks to customers, it collects their information. You can view and update this information directly from the Inbox to keep track of your leads.\n\n# Step-by-Step Instructions\n\n## Step 1: Open a Conversation\n\nClick **Inbox** from the left menu and select a conversation from the list.\n\n## Step 2: View the Customer Profile\n\nLook at the right side of the screen to see the **Contact Profile**. This shows the customer's:\n- Lead Score\n- Estimated Value\n- Name, Email, and Phone Number\n\n## Step 3: Update Customer Details\n\nIf a customer gets a new phone number, or you want to add a note about them:\n1. Click into the box you want to change (like the Phone Number box).\n2. Type the new information.\n3. Click **Save Profile** at the bottom.\n\n## Step 4: Change Lead Status\n\nYou can keep track of where a customer is in your sales process by updating their status. \n\n1. Find the **Lead Status** dropdown in the Contact Profile.\n2. Choose a new status (like \"Qualified\", \"Booked\", or \"Closed\").\n3. Click **Save Profile**.\n\n## Step 5: Assign to Staff\n\nIf a specific team member needs to handle a conversation, look at the top middle of the screen. Click the dropdown that says \"Staff Assignment\" and select a team member's name to assign the conversation to them."
  },
  "add-documents": {
    "title": "Uploading Documents",
    "description": "Teach Operator AI about your business.",
    "toc": [],
    "content": "# Overview\n\nThe Knowledge Base is where you teach Operator AI about your business. By uploading documents, Operator AI learns your policies, pricing, and services so it can answer customer questions accurately.\n\n# Step-by-Step Instructions\n\n## Step 1: Go to Knowledge Base\n\nClick **Knowledge** in the left menu.\n\n## Step 2: Upload a File\n\nFind the area that says **Upload New Document**. \n\nYou can click the box to select a file from your computer, or you can drag and drop a file directly into the box.\n\nWe support the following file types:\n- PDF documents\n- Word documents (.docx)\n- Text files (.txt)\n- Spreadsheets (.csv)\n\n## Step 3: Wait for Processing\n\nOnce you select a file, the system will process it. You will see it appear in the list of your active documents. \n\nOperator AI can now read this document and use the information inside it to answer questions!\n\n# Tips for Good Documents\n\n- **Keep it Simple:** The clearer your document is written, the better Operator AI will understand it.\n- **Use Q&A Format:** If you have a list of Frequently Asked Questions, save it as a PDF or Text file and upload it. Operator AI loves reading FAQs.\n- **Keep it Updated:** If your pricing changes, remember to delete the old pricing document and upload the new one. This prevents Operator AI from getting confused."
  },
  "view-appointments": {
    "title": "Viewing Appointments",
    "description": "See your upcoming bookings and manage your calendar.",
    "toc": [],
    "content": "# Overview\n\nThe Appointments page shows you every booking made by Operator AI or your staff. You can see who is coming in, when they are scheduled, and make changes if needed.\n\n# Step-by-Step Instructions\n\n## Step 1: Open Appointments\n\nClick **Appointments** in the left menu.\n\n## Step 2: Find a Booking\n\nIn the middle of the screen, you will see a list of all your bookings. You can:\n- Click on any booking in the list to see more details on the right side of the screen.\n- Use the search bar at the top to find a specific customer by name or phone number.\n- Use the dropdown menus at the top to only see bookings for a specific staff member, or bookings with a specific status (like only \"Confirmed\" bookings).\n\n## Step 3: Take Action on a Booking\n\nWhen you select a booking, look at the **Triage Actions** on the right side of the screen. You can click these buttons to:\n- **Confirm** the booking.\n- Mark it as **Completed** after the customer visits.\n- Mark it as a **No Show** if the customer did not arrive.\n- **Reschedule** the booking for a different day or time.\n- **Cancel** the booking entirely.\n\n## Step 4: Add Booking Notes\n\nIf you need to leave a note for your team about a specific booking:\n1. Select the booking.\n2. Look at the bottom right corner under **Staff Booking Notes**.\n3. Type your note in the box.\n4. Click **Add**."
  },
  "services-menu": {
    "title": "Services Menu",
    "description": "Manage the services your customers can book.",
    "toc": [],
    "content": "# Overview\n\nThe Services menu is where you define exactly what your business offers. Operator AI reads this list to tell customers what they can book, how much it costs, and how long it takes.\n\n# Step-by-Step Instructions\n\n## Step 1: Open Services\n\nClick **Services** in the left menu.\n\n## Step 2: Add a Category\n\nIf you want to organize your services, you should create a category first.\n1. Click **Add Category** in the top right corner.\n2. Type a name (like \"Haircuts\" or \"Consultations\").\n3. Click **Create**.\n\n## Step 3: Add a Service\n\n1. Click **Add Service** in the top right corner.\n2. Fill in the details for the service:\n   - **Name:** What is the service called?\n   - **Description:** A brief explanation of what the service includes.\n   - **Price:** How much does it cost? (You can enter 0 if it is free).\n   - **Duration:** How many minutes does this service take?\n   - **Category:** Select the category it belongs to.\n3. Click **Create Service**.\n\n## Step 4: Edit or Delete a Service\n\nIf you need to change a price or remove a service:\n1. Find the service in your list.\n2. Click the **Edit** (pencil) button to change the details, or click the **Delete** (trash can) button to remove it completely.\n\n# What Happens Next\n\nAs soon as you add or update a service, Operator AI instantly learns the new details and can start offering it to customers who want to book an appointment."
  }
};
