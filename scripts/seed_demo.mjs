import { createClient } from "@supabase/supabase-js";
import fs from "fs";

console.log("🌱 Starting Demo Dataset Seeding...");

// Load environment variables manually if needed
try {
  const envFile = fs.readFileSync(".env.local", "utf8");
  envFile.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      if (!process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  });
} catch (e) {
  console.log("Could not load .env.local natively, assuming env vars exist.");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  try {
    // 1. Get an organizer
    let { data: organizer } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("role", "organizer")
      .limit(1)
      .single();

    if (!organizer) {
      const { data: admin } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("role", "admin")
        .limit(1)
        .single();
      
      if (!admin) {
         console.error("❌ No organizer or admin found in the database. Please create an account via the UI first.");
         process.exit(1);
      }
      organizer = admin;
    }

    console.log(`✅ Using Organizer ID: ${organizer.id}`);

    // 2. Create the Grand Hackathon
    const { data: hackathon, error: hErr } = await supabase
      .from("hackathons")
      .insert({
        title: `The Grand AI & Dev Challenge 2026 (${Date.now()})`,
        slug: `grand-ai-challenge-${Date.now()}`,
        description: "A comprehensive multi-track hackathon designed to showcase all platform capabilities.",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
        status: "active",
        organizer_id: organizer.id,
        competition_type: "MULTI_TRACK"
      })
      .select()
      .single();

    if (hErr) throw hErr;
    console.log(`✅ Created Hackathon: ${hackathon.title}`);

    // 3. Create Multi-Track Categories
    const categories = [
      {
        name: "Algorithm Sprint",
        type: "CODE",
        description: "Solve a complex algorithms problem.",
        max_score: 100,
        time_limit: 120,
        order_index: 1,
        hackathon_id: hackathon.id
      },
      {
        name: "Project Pitch",
        type: "TEXT",
        description: "Write a 500-word pitch for a revolutionary AI startup.",
        max_score: 100,
        rubric_json: [
          { name: "Creativity", weight: 40, description: "Originality of the idea." },
          { name: "Clarity", weight: 30, description: "How well the problem and solution are explained." },
          { name: "Feasibility", weight: 30, description: "Can this actually be built?" }
        ],
        order_index: 2,
        hackathon_id: hackathon.id
      },
      {
        name: "Marketing Poster",
        type: "IMAGE",
        description: "Design a futuristic marketing poster for your startup.",
        max_score: 100,
        rubric_json: [
          { name: "Visual Appeal", weight: 50, description: "Aesthetics and layout." },
          { name: "Relevance", weight: 50, description: "Does it convey the message?" }
        ],
        order_index: 3,
        hackathon_id: hackathon.id
      },
      {
        name: "Pitch Deck (PDF)",
        type: "FILE",
        description: "Upload your 5-slide pitch deck.",
        max_score: 100,
        rubric_json: [
          { name: "Content", weight: 50, description: "Quality of the business plan." },
          { name: "Design", weight: 50, description: "Slide design and readability." }
        ],
        order_index: 4,
        hackathon_id: hackathon.id
      },
      {
        name: "Open Source Contribution",
        type: "URL",
        description: "Submit a link to a GitHub repository you built for this event.",
        max_score: 100,
        rubric_json: [
          { name: "Code Quality", weight: 50, description: "Clean, documented code." },
          { name: "Impact", weight: 50, description: "Usefulness of the project." }
        ],
        order_index: 5,
        hackathon_id: hackathon.id
      },
      {
        name: "AI Trivia",
        type: "MCQ",
        description: "A quick quiz on artificial intelligence history.",
        max_score: 10,
        order_index: 6,
        hackathon_id: hackathon.id
      }
    ];

    const { data: catData, error: cErr } = await supabase
      .from("competition_categories")
      .insert(categories)
      .select();

    if (cErr) throw cErr;
    console.log(`✅ Created ${catData.length} Categories.`);

    // 4. Add MCQ Questions to the Trivia Category
    const mcqCategory = catData.find(c => c.type === "MCQ");
    if (mcqCategory) {
      const mcqQuestions = [
        {
          category_id: mcqCategory.id,
          question: "Which of the following is an example of generative AI?",
          options: ["Linear Regression", "ChatGPT", "K-Means Clustering", "Decision Trees"],
          correct_ans: "B",
          marks: 5,
          order_index: 1
        },
        {
          category_id: mcqCategory.id,
          question: "Who is known as the father of Artificial Intelligence?",
          options: ["Alan Turing", "John McCarthy", "Geoffrey Hinton", "Elon Musk"],
          correct_ans: "B",
          marks: 5,
          order_index: 2
        }
      ];
      const { error: mcqErr } = await supabase.from("mcq_questions").insert(mcqQuestions);
      if (mcqErr) throw mcqErr;
      console.log(`✅ Created MCQ questions.`);
    }

    // 5. Add a coding problem for the CODE category
    const codeCategory = catData.find(c => c.type === "CODE");
    if (codeCategory) {
      const { data: prob, error: pErr } = await supabase.from("problems").insert({
        hackathon_id: hackathon.id,
        title: "Two Sum Target",
        slug: "two-sum-target-" + Date.now(),
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
        difficulty: "easy",
        time_limit_ms: 2000,
        memory_limit_mb: 256
      }).select().single();
      if (pErr) throw pErr;

      const { error: tcErr } = await supabase.from("test_cases").insert([
        { problem_id: prob.id, input: "[2,7,11,15]\n9", expected_output: "[0,1]", is_hidden: false, order_index: 0 },
        { problem_id: prob.id, input: "[3,2,4]\n6", expected_output: "[1,2]", is_hidden: true, order_index: 1 }
      ]);
      if (tcErr) throw tcErr;
      console.log(`✅ Created Coding Problem & Test Cases.`);
    }

    console.log("🎉 Seed successful! Go to the Organizer Dashboard to view the Hackathon.");
  } catch (error) {
    console.error("❌ Seed failed:", error);
  }
}

run();
