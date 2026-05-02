// Notion-sync — tar en idé och skapar/uppdaterar en rad i Christians Notion-databas.
// Kräver env vars: NOTION_API_KEY, NOTION_DATABASE_ID
const { requireUser } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const notionKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;

  if (!notionKey || !dbId) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Notion ej konfigurerat. Sätt NOTION_API_KEY och NOTION_DATABASE_ID i Netlify env." }),
    };
  }

  let idea;
  try {
    ({ idea } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  if (!idea?.id) {
    return { statusCode: 400, body: JSON.stringify({ error: "idea.id krävs." }) };
  }

  const ai = idea.aiAnalysis || {};
  const iceTotal = ai.ice
    ? ((ai.ice.impact + ai.ice.confidence + ai.ice.ease) / 3).toFixed(1)
    : null;

  // Title, status och brand som Notion-properties.
  // Användaren måste ha skapat en Notion-DB med motsvarande fält:
  // - Titel (title)
  // - Varumärke (select)
  // - Status (select)
  // - ICE (number)
  // - Energi (number)
  // - Potential (number)
  // - Tags (multi_select)
  // - IdeaDump ID (rich_text) — används för upsert
  // - Deadline (date)
  const properties = {
    "Titel": {
      title: [{ text: { content: ai.summary?.slice(0, 200) || idea.transcript?.slice(0, 200) || "Namnlös idé" } }],
    },
    "Varumärke": { select: { name: idea.brand || "Övrigt" } },
    "Status": { select: { name: statusLabel(idea.status) } },
    "IdeaDump ID": { rich_text: [{ text: { content: idea.id } }] },
  };

  if (iceTotal !== null) properties["ICE"] = { number: parseFloat(iceTotal) };
  if (typeof ai.energyScore === "number") properties["Energi"] = { number: ai.energyScore };
  if (typeof ai.potentialScore === "number") properties["Potential"] = { number: ai.potentialScore };
  if (Array.isArray(ai.tags) && ai.tags.length > 0) {
    properties["Tags"] = { multi_select: ai.tags.map(t => ({ name: t })) };
  }
  if (idea.deadline) {
    properties["Deadline"] = { date: { start: idea.deadline } };
  }

  const children = [];
  if (ai.summary) children.push(paragraph(ai.summary));
  if (ai.coachComment) children.push(callout("💬 " + ai.coachComment, "pink"));
  if (ai.nextActionSuggestion) children.push(callout("🎯 Nästa steg: " + ai.nextActionSuggestion, "blue"));
  if (ai.biggestRisk) children.push(callout("⚠️ " + ai.biggestRisk, "red"));
  if (ai.whyThisMatters) children.push(callout("🌟 " + ai.whyThisMatters, "orange"));
  if (Array.isArray(ai.pros) && ai.pros.length > 0) {
    children.push(heading2("Pros"));
    for (const p of ai.pros) children.push(bullet(p));
  }
  if (Array.isArray(ai.cons) && ai.cons.length > 0) {
    children.push(heading2("Cons"));
    for (const c of ai.cons) children.push(bullet(c));
  }
  if (idea.notes) {
    children.push(heading2("Anteckningar"));
    children.push(paragraph(idea.notes));
  }
  if (idea.transcript) {
    children.push(heading2("Originaltranskript"));
    children.push(paragraph(idea.transcript));
  }

  const headers = {
    "Authorization": `Bearer ${notionKey}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };

  // Upsert: sök efter befintlig sida med IdeaDump ID, annars skapa ny
  const searchRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      filter: {
        property: "IdeaDump ID",
        rich_text: { equals: idea.id },
      },
      page_size: 1,
    }),
  });

  if (!searchRes.ok) {
    const err = await searchRes.text();
    return { statusCode: searchRes.status, body: JSON.stringify({ error: "Notion-sök misslyckades: " + err }) };
  }

  const searchData = await searchRes.json();
  const existing = searchData.results?.[0];

  if (existing) {
    // Uppdatera befintlig sida — properties + ersätt children
    const updateRes = await fetch(`https://api.notion.com/v1/pages/${existing.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ properties }),
    });
    if (!updateRes.ok) {
      const err = await updateRes.text();
      return { statusCode: updateRes.status, body: JSON.stringify({ error: "Notion-update misslyckades: " + err }) };
    }

    // Rensa befintliga children och lägg till nya
    const existingChildren = await fetch(`https://api.notion.com/v1/blocks/${existing.id}/children`, { headers });
    if (existingChildren.ok) {
      const { results } = await existingChildren.json();
      for (const b of results || []) {
        await fetch(`https://api.notion.com/v1/blocks/${b.id}`, { method: "DELETE", headers });
      }
    }
    if (children.length > 0) {
      await fetch(`https://api.notion.com/v1/blocks/${existing.id}/children`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ children }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ updated: true, url: existing.url }),
    };
  }

  // Skapa ny sida
  const createRes = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties,
      children,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    return { statusCode: createRes.status, body: JSON.stringify({ error: "Notion-skapande misslyckades: " + err }) };
  }

  const page = await createRes.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ created: true, url: page.url }),
  };
};

function statusLabel(key) {
  const map = { inbox: "Inbox", next: "Next Action", incubate: "Inkubera", park: "Parkera", done: "Klar" };
  return map[key] || key || "Inbox";
}

function paragraph(text) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [{ type: "text", text: { content: text.slice(0, 1900) } }] },
  };
}

function heading2(text) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

function bullet(text) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: [{ type: "text", text: { content: text.slice(0, 1900) } }] },
  };
}

function callout(text, color) {
  return {
    object: "block",
    type: "callout",
    callout: {
      rich_text: [{ type: "text", text: { content: text.slice(0, 1900) } }],
      color: `${color}_background`,
    },
  };
}
