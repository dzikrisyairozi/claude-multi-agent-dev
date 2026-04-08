Standard RAG lacks context, but full agentic scanning is too slow—so I designed a "Dual-Path" architecture to fix this. In this video, we build a hybrid system using DuckDB and Gemini that combines semantic search with metadata filtering to achieve high-accuracy retrieval without the latency. Join me as we upgrade our open-source agent with smart chunking and backtracking capabilities.

Title: Indexed Retrieval: Dual-Path Search Pipeline
Flow:

Documents Folder → Docling Parse → SmartChunker (overlap) → Gemini Embeddings (768-dim vectors) → DuckDB (4 tables + embeddings)
SmartChunker (overlap) → Metadata Extract (heuristic + LLM) → DuckDB

SchemaDiscovery box:
Auto-discovers metadata fields: File type, extension, document_type; mentions_currency (heuristic); mentions_dates (heuristic); langextract: organizations, people, deal terms, monetary amounts
DuckDB tables: corpora, documents + metadata_json, chunks (text, position), chunk_embeddings (HNSW), schemas (field definitions)Prepared to analyze text and generate mermaid diagramPrepared to analyze text and generate mermaid diagramMermaid diagram of the Dual-Path Search Pipelinepipeline.mermaidLet me present the file.Presented fileDone.DoneHere's your Mermaid diagram. The main flow goes left-to-right: Documents Folder → Docling Parse → SmartChunker → (dual path) → DuckDB, with the two parallel paths being Gemini Embeddings and Metadata Extract. The SchemaDiscovery and DuckDB table details are shown as connected subgraphs with dotted lines.

Okay. Can a coding agent solve the
biggest problem of retrieval augmented
generation? This is what I'm trying to
explore with my new agentic fie search
system. The idea is very simple. Instead
of using embedding based semantic
retrieval, can simple search tools get
you the same level of accuracy? Because
today's coding agents have to do
retrieval of code snippets but they use
very simple tools like file ser
operation code execution. Now I built a
very similar system which can do
retrieval using simple file based
operations without any semantic based
retrieval component. However, embedding
based retrieval has its own place. The
question is why can't we just combine
them together? And that's exactly what
we're going to be doing in this video.
So this is the third video of a series
on agentic file search. The project is
open source already has close to 500
GitHub stars. Will appreciate if you
also give it a star if you like the
project. I will highly recommend to
watch the other two videos to get a
better understanding of how this whole
system is set up. But on a high level
there are three different phases. The
first phase is what I'm calling parallel
scan. It simply reads initial parts of
every document and based on the user
query tries to identify which documents
are most relevant. Then it does deep
dive on the candidate documents. So
let's say you get from 100 documents to
10 documents using the initial scan.
Then we do a deep dive by sending every
document to a large language model. But
here is the best part which the normal
rack system is not able to accomplish.
In most of the cases, this step is not
going to be enough. It will probably
miss relevant documents. That's where
phase three of backtracking comes into
play. So the system is smart enough that
if it finds that there is a reference to
another document, it can go back and
read that document even if it was missed
during the initial two phases. Now this
is critical for any real world
application especially if you are uh
looking at uh legal documents such as
patterns. They reference other patterns
or diagrams that might be in another
document. Now with this system you can
actually provide your domain knowledge
to the agent and it will be able to
backtrack and cross reference other
documents. So it becomes very helpful in
real world. However, there's a major
drawback and the problem is that since
it has to read every document, it's
extremely slow. So you can't really use
it for realtime applications. Now, some
of you asked me, why can't we just
combine this with normal traditional
retrieval augmented generation as a
filtering step? And that's exactly what
we're going to be looking at in this
video. Now, this is going to use a dual
path search pipeline, and I'm going to
explain how this works. So in its
existing uh uh setup it doesn't use any
pre-processing whatsoever except that it
does document parsing through dockling
to enable every document is in markdown.
But now this new setup is going to
introduce the concept of smart chunking.
So essentially we divide every document
into subdocuments using chunking. We
compute embeddings. Right now I'm using
Gemini for that. Along with that it also
extract metadata from every document.
Now uh the metadata can be userdefined
or the system can itself automatically
extract that metadata for you. For
metadata extraction we using lang
extract uh which is a Gemini powered
information extraction library. I
previously covered this in one of my
videos. I highly recommend to watch
that. So in the end everything is
written into duck DB. Now the corpus
that you get has four different tables.
The first one is the original documents
along with the metadata the chunks that
were created embeddings and then this
schema. These are definitely the
metadata uh these are um these are
basically the metadata field either
defined by the system or user provided.
metadata is either userdefined or
automatically extracted by the large
language model and this is critical uh
for real world applications. So let's
say if you have invoice data set you
want the LM to extract certain
information for you you can create that
as a metadata field and then you can use
that for filtering of your documents
before you feed it into the normal
agentic search system. Now here's how
the system works at query time. Uh so
when the user query comes in, we run the
same query through multiple different
passes based on the mode. We're going to
talk about those in a minute. Uh so you
have the semantic search path, you have
the metadata based filtering path. It
basically is going to filter documents,
not chunks, but actual documents. and
then we dduplicate them and feed those
into our agentic file search. So again,
you are reducing the search space that
the agent has to work with, which will
give you a pretty good boost in speed.
Now, here's the uh beautiful part about
this setup. You don't really have to
worry about the accuracy of retrieval in
this first step because the agent is
going to take care of most of that.
Okay. So the system has four different
modes of operation. The first one is
pure agentic search. This is what I have
covered in my previous videos.
Essentially it's just use the agent
along with these simple tools that are
available to do exploration in search.
By the way, the idea came from harness
engineering, which is a new emerging
field. And the idea here is that you
want to give your agent generalized
tools, not task specific tools, but
generalized tools that uh it can
leverage to solve problems uh rather
than having uh rigid workflows. If
you're interested in the topic, I am
putting together a video on that. So,
make sure to subscribe to the channel.
The second mode is where you use uh
semantic search as a prefiltering. We do
semantic search on chunks levels but the
agentic file search step is going to
receive the documents. Now these can be
enabled or disabled with simple flags
that you provide to the agent when
you're running it in the CLI. The third
mode is that you can just enable
metadata based filtering of certain
documents before you pass it on to the
agent. And the last mode is that you can
enable everything. So it will do
filtering or the initial uh retrieval
based on the metadata that you provide
semantic search and then we'll pass on
the candidate documents to your agent.
Now, at the moment, everything is
powered by Gemini model because they
have the longest context window and
they're pretty good at needling the
hstack problem. But if you want to use
another provider, you can do that. Okay,
so let me walk you through the
installation process, which is pretty
quick. You just need to clone the repo
and run the dependencies by running this
command. Now if you want to use an API a
proprietary models I highly recommend to
use the Gemini model. Uh you will need
to provide your Gemini API key. There is
also a version of this on a separate
branch that you can run with a local
model. However, since the agent has to
work with a number of different tools
and it's a multi-step process, I have
found that smaller openweight models are
not good at it. So I would recommend
something like a 32B model. I created a
video on that. I will put it in the
video description if you are interested.
Now, in order to run it, there are two
different modes. One is the CLI. You
just point it to the folder and you can
ask questions. And the second one is a
web UI, which is a web interface that
you can use to retrieve information. So,
let me walk you through the web
interface of how the retrieval looks
like. Okay. So, here's how the interface
looks like. Now, first you'll need to uh
select a folder. In my case, I have
selected a folder that has 11 different
documents. I am doing this because I
just want to show you a quick demo of
how this thing works. Now, when you are
indexing your documents, uh you're going
to be presented with this screen for the
first time. Uh once you index them, they
are going to persist in your file
system. So, you don't have to run this
again. So, here are a few options. If
you want to use the semantic search, you
will need to generate your embeddings.
So you'll need to click on this. Now you
can define a custom schema and this is
document level schema. This is extremely
helpful if you know the nature of your
documents. Again, let's say if you're
working with invoice data, you might
want to provide who the pay is, what are
the invoice amount, dates, addresses,
that can be extracted by lang extract
for you. So you can just define the
schema over here or you can use the auto
discover which basically is going to
read a bunch of different documents then
based on that it will try to identify
what type of documents are present and
what type of information this system can
extract. So for example the document uh
documents that I'm providing are legal
documents related to an acquisition. So
you can see that it saw that okay uh the
documents talks about acquisition uh so
it tried to extract data fields or
metadata fields that it thinks are going
to be relevant based on the information
that is present. Right? So you could run
this and then change it modify it based
on your own needs. And once this is done
just start indexing. Now during the
indexing process it's going to do uh
document parsing to standardize
everything. Then it's going to uh
extract the metadata. It runs a
standardized process on the metadata as
well. So let's say there might be some
documents which might have like a
financial impact. Uh other documents
might use another word for it. Right? So
it runs these normalization process to
make sure that the metadata extracted
doesn't have duplicates in the system
and you're using normalized fields.
Okay. So once everything is done you're
going to have index document and now you
can start your retrieval here. Now I can
enable or disable different components.
So for example I can enable both the
semantic metadata and the agentic
pipeline. And let's say if I ask
something like summarize the risk
assessment PDF file right now the system
is smart enough to automatically
identify what exactly it's supposed to
do because it is an agentic system. If
you use a simple rack setup it will
probably not be able to summarize an
entire PDF file for you. Right? But in
this case if you look here so it says uh
starting phase one with semantic search
for quickly retrieving the index content
and metadata for uh this PDF file right
it does f uh file name level semantic
search as well. So this is the PDF file
that it got and then it says okay now I
am retrieving the full document to
extract the prioritized task factors
mitigation strategy and financial impact
summaries right so then uh it
automatically goes and retrieves the
whole document send it to the Gemini API
and we get a full assessment of what
exactly is in that document with proper
references to different sections in the
document which is pretty powerful. This
is a very powerful design pattern and
I'll highly recommend to check this out
if you are interested in retrieval
augmented generation. Now keep in mind
uh this is not a production ready
system. I have quite a few other ideas
that I'm playing around with. But if you
need help with a retrieval augmented
generation system for your own
applications, you can reach out to me.
I'll be happy to help. Details are going
to be in the video description. Anyways,
I hope you found this video useful.
Thanks for watching and as always, see
you in the next

---
title: "Indexed Retrieval: Dual-Path Search Pipeline"
---
flowchart LR
    A["📁 Documents Folder"] --> B["Docling Parse"]
    B --> C["SmartChunker\n(overlap)"]
    C --> D["Gemini Embeddings\n(768-dim vectors)"]
    C --> E["Metadata Extract\n(heuristic + LLM)"]
    D --> F["🦆 DuckDB\n(4 tables + embeddings)"]
    E --> F

    subgraph SchemaDiscovery["SchemaDiscovery"]
        SD["Auto-discovers metadata fields:\n- File type, extension, document_type\n- mentions_currency (heuristic)\n- mentions_dates (heuristic)\n- langextract: organizations, people,\n  deal terms, monetary amounts"]
    end

    subgraph DuckDB_Tables["DuckDB Tables"]
        T1["corpora"]
        T2["documents + metadata_json"]
        T3["chunks (text, position)"]
        T4["chunk_embeddings (HNSW)"]
        T5["schemas (field definitions)"]
    end

    E -.- SchemaDiscovery
    F -.- DuckDB_Tables

    style A fill:#c47a20,stroke:#e8a030,color:#fff
    style B fill:#5b4a9e,stroke:#7b6abe,color:#fff
    style C fill:#7b5cb8,stroke:#9b7cd8,color:#fff
    style D fill:#2a7ab5,stroke:#4a9ad5,color:#fff
    style E fill:#b8860b,stroke:#d8a62b,color:#fff
    style F fill:#1a6b3a,stroke:#2a8b4a,color:#fff