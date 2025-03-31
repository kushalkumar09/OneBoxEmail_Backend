require('dotenv').config();
const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');
const Email = require('../models/email.js');
const User = require('../models/user.js'); // User model stores selected accounts
const moment = require('moment');

// IMAP Configuration
const imapConfig = (email, password, host, port) => ({
    imap: {
        user: email,
        password: password,
        host: host,
        port: port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
    }
});

// Fetch Emails with Upsert (Avoid Duplicates)
const fetchEmails = async (imap, userId, userEmail) => {
    try {
        await imap.openBox('INBOX');
        const sinceDate = moment().subtract(2, 'days').format('DD-MMM-YYYY');
        const searchCriteria = ['ALL', ['SINCE', sinceDate]];
        const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true };

        const messages = await imap.search(searchCriteria, fetchOptions);
        console.log(`Found ${messages.length} emails for ${userEmail}`);

        // Get existing email IDs from MongoDB
        const existingEmails = await Email.find({ userId, userEmail }).select('emailId');
        const existingEmailIds = new Set(existingEmails.map(e => e.emailId));

        let bulkOperations = [];
        let fetchedEmailIds = new Set();

        for (const msg of messages) {
            const header = msg.parts.find(part => part.which === 'HEADER').body;
            const textPart = msg.parts.find(part => part.which === 'TEXT');
            const emailId = msg.attributes.uid; // Unique ID from IMAP

            const emailData = {
                userId, // Store emails per user
                userEmail,
                emailId,
                from: header.from ? header.from[0] : 'Unknown',
                subject: header.subject ? header.subject[0] : 'No Subject',
                date: header.date ? new Date(header.date[0]) : new Date(),
                body: textPart ? textPart.body.trim() : 'No Content'
            };

            fetchedEmailIds.add(emailId);

            // If the email already exists, skip it
            if (existingEmailIds.has(emailId)) {
                continue;
            }

            bulkOperations.push({
                updateOne: {
                    filter: { userId, userEmail, emailId },
                    update: { $set: emailData },
                    upsert: true
                }
            });
        }

        // Remove emails that are no longer in the inbox
        await Email.deleteMany({ userId, userEmail, emailId: { $nin: Array.from(fetchedEmailIds) } });

        // Execute bulk updates only if there are changes
        if (bulkOperations.length > 0) {
            await Email.bulkWrite(bulkOperations);
            console.log(`Synced ${bulkOperations.length} emails for ${userEmail}`);
        }
    } catch (error) {
        console.error(`Error fetching emails for ${userEmail}:`, error);
    }
};

// Start IMAP Listener (Real-Time Sync)
const startImapListener = async (userId, userEmail, password, host, port) => {
    try {
        const imap = await Imap.connect(imapConfig(userEmail, password, host, port));
        console.log(`IMAP connected for ${userEmail}`);

        await fetchEmails(imap, userId, userEmail);

        imap.on('mail', async () => {
            console.log(`New email received for ${userEmail}`);
            await fetchEmails(imap, userId, userEmail);
        });

        imap.on('error', (err) => {
            console.error(`IMAP error for ${userEmail}:`, err);
        });

        return imap;
    } catch (error) {
        console.error(`IMAP Connection Failed for ${userEmail}:`, error);
        throw error;
    }
};

// Sync Emails for Multiple Accounts
const syncMultipleAccounts = async (userId) => {
    try {
        const user = await User.findById(userId); // Fetch user data
        if (!user || !user.selectedEmails || user.selectedEmails.length === 0) {
            console.log(`No email accounts selected for user ${userId}`);
            return;
        }

        // Run IMAP sync for each selected email account
        await Promise.all(user.selectedEmails.map(({ email, password, host, port }) => 
            startImapListener(userId, email, password, host, port)
        ));

        console.log(`All selected accounts are being synced for user ${userId}`);
    } catch (error) {
        console.error(`Error syncing multiple accounts for user ${userId}:`, error);
    }
};

module.exports = { syncMultipleAccounts };
