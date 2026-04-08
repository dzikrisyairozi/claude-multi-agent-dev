-- Function to perform vector similarity search on document embeddings
create or replace function public.match_document_embeddings(
  query_embedding vector(1536),
  match_count int default 5,
  similarity_threshold float default 0.5
)
returns table (
  id uuid,
  user_id uuid,
  document_id uuid,
  embedding vector(1536),
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select 
    de.id,
    de.user_id,
    de.document_id,
    de.embedding,
    de.content,
    de.metadata,
    1 - (de.embedding <=> query_embedding) as similarity
  from public.document_embeddings de
  where de.user_id = auth.uid()
    and 1 - (de.embedding <=> query_embedding) > similarity_threshold
  order by de.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.match_document_embeddings to authenticated;