Let's improve the Performance of the apps related to chat and upload (Reduce The Latency), think about as Product Owner as well, and also what user care is about the latency, need for the speed and performance akin like web chat of claude or chatgpt or gemini web 

(if need refactor of the flow, it is okay)

1. we will use
gpt-5.4-nano and file_input of OpenAI Responses API

and will use the `gemini-embedding-2-preview` multimodal embedding
so no need to convert into content before embedding, just need to vector embed immediately

2. we will need to upload first at the chat like this @/Users/syahiidkamil/Projects/80nCompany/eb-filemg-atlas/REPOS/EB-FILEMG/docs/kamil/phase_3E/images/1_upload_first_behavior.png (The UI/UX should be like that)

we should await promise All settled for the upload (need parse for docx and xlsx as the multimodal embedding did not yet support it) and the multi modal embedding

3. Chat mode will use the in context windows first, even the files is in context

with "type": "input_file" it will reduce the round trips as just straighforward comes from chat of frontend or backend inmemory did not need the refetch from database or s3 all the time (only at the beginning) thus will reduce great lattency (but think if user change to other page or chats scenarior as well, how to bring back the files)
```just example
 {
    "type": "input_file",
    "filename": "draconomicon.pdf",
    "file_data": "...base64 encoded PDF bytes here..."
}
```
if user ask something that related to submission or files, will simply check withing the context windows, only when the info did not exist in the context windows then

look at the for the inspiration @/Users/syahiidkamil/Projects/80nCompany/multi-modal-embedding-demo

also the @/Users/syahiidkamil/Projects/80nCompany/multi-modal-embedding-demo/docs/system_design_chatbot_and_rag.md and @/Users/syahiidkamil/Projects/80nCompany/multi-modal-embedding-demo/docs