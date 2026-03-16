import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabaseUrl, dbPassword, schemaSql } = await req.json();

    if (!supabaseUrl || !dbPassword || !schemaSql) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: supabaseUrl, dbPassword, schemaSql' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract project ref from Supabase URL
    // Format: https://[project-ref].supabase.co
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid Supabase URL format. Expected: https://xxxxx.supabase.co' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const projectRef = urlMatch[1];

    // Connect to the external Supabase database directly
    // Direct connection: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
    const dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

    // Use Deno's postgres driver
    const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    
    const client = new Client(dbUrl);
    await client.connect();

    try {
      // Execute the schema SQL
      // Split by semicolons and execute each statement to handle errors better
      // But first try executing all at once
      await client.queryArray(schemaSql);
      
      await client.end();

      return new Response(
        JSON.stringify({ success: true, message: 'Schema criado com sucesso!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (sqlError: any) {
      await client.end();
      
      // If some objects already exist, that's OK - try statement by statement
      if (sqlError.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ success: true, message: 'Schema já existe ou foi criado parcialmente. Verifique a conexão.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `SQL Error: ${sqlError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: any) {
    console.error('Setup schema error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno ao configurar o schema' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
