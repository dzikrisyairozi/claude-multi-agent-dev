〇 User Screen
1. Account name display on Gmail login
On the user screen, the approved Gmail account name is not populated. When logging in via Gmail, please make it so the account name is automatically filled in.
(no reply)
https://octpath.gyazo.com/ec52e7f340d2d4512480372c022e3970 (same as @docs/kamil/phase_2D/endo_san_reported_bugs/bug1.png)

〇 Chat Screen
2. File upload speed / Chat speed
Uploading takes too long. Even a ~4MB file took about 1 minute. Please investigate whether this is caused by file size or another factor, and consider whether it can be improved. Also, the chat itself feels slow, so please check whether this is due to server specs or processing logic.
https://octpath.gyazo.com/b1dac4541d2f66c02d1b6fdc2a7dc6f8 (same as @docs/kamil/phase_2D/endo_san_reported_bugs/bug2.png)

(my reply:
Thank you for pointing this out. I am aware of this issue.
The app overall also feels somewhat sluggish, and whether this is due to the code or the Supabase Dev environment specs still requires further investigation.

Regarding the upload and chat speed, the main cause is that multiple processes are chained within a single action.
I have already made improvements to balance speed and performance.

However, further performance optimization will require more in-depth debugging, experimentation, and architectural review, so I would appreciate some additional time for this.

Additionally, I believe UI/UX changes could also be effective.
For example, separating the upload action from the chat action — similar to how ChatGPT handles it — could improve the perceived speed.

impact: keep only at backlog)

3. Consecutive file upload support
I'd like to be able to upload the next file even while a file upload is still in progress. On the chat screen, please make it so drag & drop is always accepted, allowing consecutive file uploads.
https://octpath.gyazo.com/013b6fe623cc12ad3999484325e61048
(my reply:
Understood. This is closely related to the issue raised in #2.

Currently, because the upload and chat processing are tightly coupled, the next upload is blocked until the current one completes.

As mentioned in #2, separating the upload action from the chat action — similar to how ChatGPT handles it — would resolve this. ChatGPT allows users to continue uploading files without blocking, since the upload process runs independently from the chat interaction.

By applying this UI/UX change, drag & drop can remain always active, and consecutive file uploads would be naturally supported.)

4. Change Enter key send behavior
Currently, pressing Enter in the chat sends the message. Please change it so that Enter creates a new line, and Shift+Enter sends the message.
(https://octpath.gyazo.com/6bdd06293691d65b288b0fa0344eccb5)

5. Remove unnecessary suggestions / Make responses more concise
There are cases where it appears to be suggesting things that can't actually be done — for example, image cropping, which is not currently possible. Please stop suggesting things that aren't supported. Also, the chat responses feel long and roundabout, so please reduce unnecessary suggestions and adjust for more concise replies.
https://octpath.gyazo.com/255465692a08285071df27ad467ff2cf
(my reply: Noted. For the short term, I believe this can be addressed by adjusting the prompt — specifically instructing the AI to only suggest actions that are currently supported, and to keep responses shorter and more direct.

I will review and update the prompt accordingly.)

6. Display file URLs / Preview support in chat
When asking about a file in the chat, I'd like the corresponding file's URL to be displayed. Also, if the response includes a relevant image, please make it so a preview is shown within the chat.
https://octpath.gyazo.com/bdc43f854ee25b83bf29cdb9aacede6e

(my reply:
Noted. Displaying file URLs and image previews directly in the chat will certainly improve the user experience. I will work on implementing this.

even though might decrease the performance)

7. Enable file organization even with vague instructions
I'd like file organization to work even with natural/vague instructions in chat. For example, I'd like it to handle ambiguous chat instructions such as:

Organize by specifying a folder name
Put images where there are already many images
Group invoices into an invoices folder

Please consider how to implement this kind of intent-based file organization.

(my reply:

Understood. This feature would require a different implementation framework compared to the current setup, and by nature, the AI processing for intent-based file organization will take longer to complete.

Technically, this would likely require an Agent SDK or Code Interpreter approach. I have experimented with the Code Interpreter, and it does require significantly more processing time.

Additionally, a UI/UX change may also be needed — for example, allowing the chat process to continue running in the background even when the user navigates away to another page. This would ensure that longer-running tasks like file organization can complete without interruption.

I will look into the feasibility and approach in more detail.
)

〇 My Files Screen
8. File preview display inside folders
On the My Files screen, please make it so that image previews (etc.) are also displayed when inside a folder.
https://octpath.gyazo.com/db4aa60dc7f247e5c7c77aa8517e6569

(my reply:
Noted. Just to confirm — this would apply to Grid view mode only, correct? In List view mode, previews would not be displayed, similar to how Google Drive handles it.

I will proceed with that approach unless otherwise advised.

Mitsuyoshi Endo [2:45 PM]
@Syahiid Kamil - (3/21-3/22 Leave)
Yes, that's right! No preview needed for List view — that's fine.
)

9. Bulk move for multiple files
Currently, even when multiple files are selected, they can only be moved one at a time. Please make it possible to move multiple selected files to a specified folder at once.
https://octpath.gyazo.com/46477ea3dbceffa3f505723a2598856c
(my reply:
Noted. It appears this functionality was previously working but has been affected and is currently not functioning correctly. I will investigate the cause and fix it.
)