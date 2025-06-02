import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface AIBlogRequest {
  images: string[]; // base64 encoded images
  driveData: {
    distance: number;
    duration: number;
    startLocation: string;
    endLocation: string;
    routeName?: string;
    pitStops?: any[];
    weatherConditions?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    notes?: string;
  };
}

export interface AIBlogResponse {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  estimatedReadTime: number;
}

export async function generateDriveBlog(request: AIBlogRequest): Promise<AIBlogResponse> {
  try {
    console.log('OpenAI generateDriveBlog called with:', { 
      imageCount: request.images?.length || 0, 
      driveData: request.driveData 
    });
    const { images, driveData } = request;
    
    const systemPrompt = `You are an expert automotive writer who creates engaging travel blogs from driving experiences. 
    Create a compelling blog post based on the provided drive data and images. 
    Focus on the journey, scenery, driving experience, and automotive passion.
    Write in an enthusiastic but authentic tone that resonates with car enthusiasts.
    
    Respond with JSON in this exact format:
    {
      "title": "Engaging blog title (max 100 chars)",
      "content": "Full blog content (500-1000 words) with detailed descriptions of the drive, scenery, and experience",
      "excerpt": "Compelling excerpt for social media (150-200 chars)",
      "tags": ["array", "of", "relevant", "tags"],
      "estimatedReadTime": 5
    }`;

    const userContent = [
      {
        type: "text" as const,
        text: `Create a driving blog from this data:
        
        Route: ${driveData.startLocation} to ${driveData.endLocation}
        ${driveData.routeName ? `Route Name: ${driveData.routeName}` : ''}
        Distance: ${driveData.distance} miles
        Duration: ${Math.floor(driveData.duration / 60)}h ${driveData.duration % 60}m
        Vehicle: ${driveData.vehicleMake} ${driveData.vehicleModel}
        Weather: ${driveData.weatherConditions || 'Clear'}
        ${driveData.notes ? `Driver Notes: ${driveData.notes}` : ''}
        ${driveData.pitStops?.length ? `Pit Stops: ${driveData.pitStops.length}` : ''}
        
        Write an engaging blog post about this driving experience.`
      }
    ];

    // Add images if provided
    if (images && images.length > 0) {
      images.slice(0, 3).forEach(image => { // Limit to 3 images for cost control
        userContent.push({
          type: "image_url" as const,
          image_url: {
            url: `data:image/jpeg;base64,${image}`
          }
        });
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userContent
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      title: result.title || "Epic Drive Adventure",
      content: result.content || "An amazing driving experience through scenic routes.",
      excerpt: result.excerpt || "Just completed an incredible drive!",
      tags: result.tags || ["driving", "adventure"],
      estimatedReadTime: result.estimatedReadTime || 5,
    };
  } catch (error) {
    console.error("Failed to generate AI blog:", error);
    throw new Error("Failed to generate AI blog: " + (error as Error).message);
  }
}

export async function analyzeVehicleImage(base64Image: string): Promise<{
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  type?: string;
  description: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert automotive identifier. Analyze vehicle images and provide detailed information.
          Respond with JSON in this format:
          {
            "make": "Vehicle make (e.g., BMW, Toyota)",
            "model": "Vehicle model (e.g., M3, Camry)",
            "year": "Estimated year or year range",
            "color": "Primary color",
            "type": "Vehicle type (car, motorcycle, truck, etc.)",
            "description": "Detailed description of the vehicle and any notable features"
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify this vehicle and provide detailed information about its make, model, year, and notable features."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      make: result.make,
      model: result.model,
      year: result.year,
      color: result.color,
      type: result.type,
      description: result.description || "Vehicle analysis completed.",
    };
  } catch (error) {
    console.error("Failed to analyze vehicle image:", error);
    throw new Error("Failed to analyze vehicle image: " + (error as Error).message);
  }
}

export async function generateRouteRecommendations(location: string, preferences: {
  distance?: "short" | "medium" | "long";
  difficulty?: "easy" | "moderate" | "challenging";
  scenery?: "mountain" | "coastal" | "desert" | "urban";
  vehicleType?: string;
}): Promise<{
  routes: Array<{
    name: string;
    description: string;
    distance: string;
    estimatedTime: string;
    difficulty: string;
    highlights: string[];
  }>;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert driving route consultant who knows the best scenic and exciting driving routes.
          Provide route recommendations based on location and preferences.
          Focus on real, well-known driving routes that are popular among automotive enthusiasts.
          
          Respond with JSON in this format:
          {
            "routes": [
              {
                "name": "Route name",
                "description": "Brief description of the route",
                "distance": "Distance with units",
                "estimatedTime": "Estimated driving time",
                "difficulty": "easy/moderate/challenging",
                "highlights": ["highlight1", "highlight2", "highlight3"]
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Recommend 3-5 driving routes near ${location} with these preferences:
          Distance preference: ${preferences.distance || "any"}
          Difficulty: ${preferences.difficulty || "any"}
          Scenery type: ${preferences.scenery || "any"}
          Vehicle type: ${preferences.vehicleType || "car"}
          
          Focus on routes that are popular with car enthusiasts and offer great driving experiences.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      routes: result.routes || [],
    };
  } catch (error) {
    console.error("Failed to generate route recommendations:", error);
    throw new Error("Failed to generate route recommendations: " + (error as Error).message);
  }
}
