"""Static reference data: Bangalore areas, the offline taste graph and the question bank.

The taste catalog mirrors the shape of Qloo entities so the mock client and the live
client can be swapped without the rest of the app noticing.
"""

# name: (lat, lng, popularity weight, typical monthly rent share in INR)
AREAS: dict[str, tuple[float, float, float, int]] = {
    "Koramangala": (12.9352, 77.6245, 10, 21000),
    "Indiranagar": (12.9784, 77.6408, 9, 22000),
    "HSR Layout": (12.9116, 77.6389, 10, 18000),
    "BTM Layout": (12.9166, 77.6101, 8, 14000),
    "Jayanagar": (12.9308, 77.5838, 6, 15000),
    "JP Nagar": (12.9063, 77.5857, 6, 14000),
    "Whitefield": (12.9698, 77.7500, 8, 15000),
    "Marathahalli": (12.9592, 77.6974, 6, 13500),
    "Bellandur": (12.9304, 77.6784, 7, 18000),
    "Sarjapur Road": (12.9100, 77.6870, 6, 16500),
    "Electronic City": (12.8452, 77.6602, 6, 11500),
    "Hebbal": (13.0358, 77.5970, 4, 14500),
    "Yelahanka": (13.1007, 77.5963, 3, 11000),
    "Malleshwaram": (13.0035, 77.5643, 4, 14000),
    "Rajajinagar": (12.9916, 77.5520, 3, 12500),
    "Basavanagudi": (12.9422, 77.5755, 4, 13500),
    "Banashankari": (12.9255, 77.5468, 4, 12000),
    "Frazer Town": (12.9985, 77.6130, 3, 16000),
    "MG Road": (12.9756, 77.6068, 3, 24000),
    "Domlur": (12.9609, 77.6387, 4, 19000),
    "CV Raman Nagar": (12.9857, 77.6640, 4, 15500),
    "KR Puram": (13.0070, 77.6960, 3, 11500),
    "Kalyan Nagar": (13.0280, 77.6400, 4, 14500),
    "HBR Layout": (13.0330, 77.6230, 3, 14000),
    "Yeshwanthpur": (13.0285, 77.5400, 3, 13000),
    "Vijayanagar": (12.9719, 77.5301, 3, 11500),
    "Richmond Town": (12.9638, 77.5990, 2, 23000),
    "Ulsoor": (12.9811, 77.6209, 3, 20000),
}

# tag -> (label, emoji, group, [(entity name, entity type)])
TAGS: dict[str, tuple[str, str, str, list[tuple[str, str]]]] = {
    "indie_music": ("Indie & acoustic music", "🎸", "music", [("Prateek Kuhad", "artist"), ("The Local Train", "artist"), ("When Chai Met Toast", "artist"), ("Raghu Dixit Project", "artist"), ("Peter Cat Recording Co.", "artist")]),
    "bollywood": ("Bollywood hits", "💃", "music", [("Arijit Singh", "artist"), ("A. R. Rahman", "artist"), ("Pritam", "artist"), ("Shreya Ghoshal", "artist")]),
    "hiphop": ("Hip-hop & rap", "🎤", "music", [("Divine", "artist"), ("Seedhe Maut", "artist"), ("Kendrick Lamar", "artist"), ("Raftaar", "artist")]),
    "edm": ("EDM & electronic", "🎧", "music", [("Nucleya", "artist"), ("Zedd", "artist"), ("Avicii", "artist"), ("Martin Garrix", "artist")]),
    "rock_metal": ("Rock & metal", "🤘", "music", [("Coldplay", "artist"), ("Parikrama", "artist"), ("Linkin Park", "artist"), ("Pink Floyd", "artist")]),
    "classical": ("Classical & fusion", "🎻", "music", [("Ustad Zakir Hussain", "artist"), ("Shankar Mahadevan", "artist"), ("Karsh Kale", "artist"), ("L. Subramaniam", "artist")]),
    "kpop": ("K-pop & K-dramas", "💜", "screen", [("BTS", "artist"), ("BLACKPINK", "artist"), ("Squid Game", "tv_show"), ("Crash Landing on You", "tv_show")]),
    "kannada_cinema": ("Kannada cinema", "🎥", "screen", [("Kantara", "movie"), ("KGF: Chapter 1", "movie"), ("Lucia", "movie"), ("Kirik Party", "movie"), ("Sapta Sagaradaache Ello", "movie")]),
    "south_cinema": ("Tollywood & Kollywood", "🔥", "screen", [("RRR", "movie"), ("Pushpa", "movie"), ("Vikram", "movie"), ("Baahubali", "movie")]),
    "hollywood": ("Hollywood & Netflix binges", "🍿", "screen", [("Breaking Bad", "tv_show"), ("Stranger Things", "tv_show"), ("Oppenheimer", "movie"), ("The Office", "tv_show")]),
    "indie_films": ("World & indie cinema", "🎞️", "screen", [("Parasite", "movie"), ("The Lunchbox", "movie"), ("Gully Boy", "movie"), ("Past Lives", "movie")]),
    "anime": ("Anime", "🍥", "screen", [("Attack on Titan", "tv_show"), ("One Piece", "tv_show"), ("Spirited Away", "movie"), ("Death Note", "tv_show")]),
    "scifi": ("Sci-fi & fantasy", "🚀", "screen", [("Dune", "movie"), ("Interstellar", "movie"), ("Game of Thrones", "tv_show"), ("The Expanse", "tv_show")]),
    "standup": ("Stand-up comedy", "🎙️", "screen", [("Zakir Khan", "person"), ("Biswa Kalyan Rath", "person"), ("Kenny Sebastian", "person"), ("Trevor Noah", "person")]),
    "gaming": ("Gaming", "🎮", "play", [("Valorant", "videogame"), ("BGMI", "videogame"), ("FIFA 24", "videogame"), ("Counter-Strike 2", "videogame"), ("Elden Ring", "videogame")]),
    "board_games": ("Board games & chess", "♟️", "play", [("Catan", "brand"), ("Chess.com", "brand"), ("Uno", "brand"), ("Dungeons & Dragons", "brand")]),
    "cricket": ("Cricket", "🏏", "active", [("Royal Challengers Bengaluru", "brand"), ("Virat Kohli", "person"), ("M. Chinnaswamy Stadium", "place"), ("IPL", "brand")]),
    "football": ("Football", "⚽", "active", [("Bengaluru FC", "brand"), ("Sunil Chhetri", "person"), ("Lionel Messi", "person"), ("Real Madrid", "brand")]),
    "fitness": ("Gym & fitness", "💪", "active", [("Cult.fit", "brand"), ("Decathlon", "brand"), ("Gold's Gym", "brand"), ("Huel", "brand")]),
    "yoga": ("Yoga & wellness", "🧘", "active", [("Isha Foundation", "brand"), ("Art of Living", "brand"), ("Headspace", "brand")]),
    "trekking": ("Trekking & road trips", "🥾", "active", [("Nandi Hills", "place"), ("Skandagiri", "place"), ("Coorg", "destination"), ("Gokarna", "destination"), ("Chikmagalur", "destination")]),
    "travel": ("Travel & backpacking", "✈️", "active", [("Hampi", "destination"), ("Goa", "destination"), ("Ladakh", "destination"), ("Bali", "destination")]),
    "foodie": ("Street food & local eats", "🍜", "food", [("CTR (Central Tiffin Room)", "place"), ("Vidyarthi Bhavan", "place"), ("MTR", "place"), ("Meghana Foods", "place"), ("Corner House", "place")]),
    "cafes": ("Café hopping", "☕", "food", [("Third Wave Coffee", "place"), ("Blue Tokai", "place"), ("Matteo Coffea", "place"), ("Dyu Art Cafe", "place")]),
    "craft_beer": ("Craft beer & brewpubs", "🍺", "food", [("Toit", "place"), ("Bangalore Brewing Company", "place"), ("Arbor Brewing Company", "place"), ("Byg Brewski", "place")]),
    "fine_dining": ("Fine dining", "🍷", "food", [("Karavalli", "place"), ("Olive Beach", "place"), ("Smoke House Deli", "place"), ("The Permit Room", "place")]),
    "cooking_hobby": ("Cooking & baking", "🍳", "food", [("MasterChef India", "tv_show"), ("Ranveer Brar", "person"), ("Salt Fat Acid Heat", "tv_show"), ("Nigella Lawson", "person")]),
    "books": ("Reading & bookstores", "📚", "mind", [("Atta Galatta", "place"), ("Blossoms Book House", "place"), ("Sapiens", "book"), ("Atomic Habits", "book"), ("The Alchemist", "book")]),
    "art_theatre": ("Art, theatre & museums", "🎭", "mind", [("Ranga Shankara", "place"), ("Jagriti Theatre", "place"), ("National Gallery of Modern Art", "place"), ("Museum of Art & Photography", "place")]),
    "photography": ("Photography", "📷", "mind", [("Lalbagh Botanical Garden", "place"), ("Cubbon Park", "place"), ("Canon", "brand"), ("Sony Alpha", "brand")]),
    "startups": ("Startups & tech talks", "💡", "mind", [("Y Combinator", "brand"), ("Lex Fridman Podcast", "podcast"), ("How I Built This", "podcast"), ("Paul Graham Essays", "book")]),
    "nightlife": ("Clubbing & nightlife", "🪩", "social", [("Skyye Bangalore", "place"), ("Social", "place"), ("Hard Rock Cafe Bangalore", "place"), ("Sunburn", "brand")]),
}

# Cluster "personas" used to make the seeded taste data correlated and realistic.
PERSONAS: dict[str, list[str]] = {
    "techie_homebody": ["startups", "hollywood", "gaming", "scifi", "anime", "books", "cafes"],
    "weekend_explorer": ["trekking", "travel", "photography", "indie_music", "cafes", "foodie"],
    "social_butterfly": ["nightlife", "craft_beer", "edm", "bollywood", "standup", "fine_dining"],
    "fit_foodie": ["fitness", "yoga", "foodie", "cooking_hobby", "cricket", "football"],
    "culture_buff": ["art_theatre", "books", "classical", "indie_films", "kannada_cinema", "cafes"],
    "gamer": ["gaming", "anime", "hiphop", "board_games", "scifi", "edm"],
    "desi_cinephile": ["south_cinema", "kannada_cinema", "bollywood", "cricket", "foodie", "standup"],
    "kwave_fan": ["kpop", "anime", "cafes", "hiphop", "indie_music", "photography"],
    "rock_soul": ["rock_metal", "craft_beer", "indie_music", "trekking", "football", "nightlife"],
}

ENTITY_TAGS: dict[str, list[str]] = {}
ENTITIES: dict[str, dict] = {}
for _tag, (_label, _emoji, _group, _ents) in TAGS.items():
    for _name, _type in _ents:
        _e = ENTITIES.setdefault(_name, {"id": "mock:" + _name.lower().replace(" ", "-"), "name": _name, "type": _type, "tags": []})
        if _tag not in _e["tags"]:
            _e["tags"].append(_tag)
        ENTITY_TAGS.setdefault(_name, []).append(_tag)

# ---------------------------------------------------------------------------------------
# Question bank. "hard" questions remove people outright; the rest only soften the score.
# ---------------------------------------------------------------------------------------
TRAIT_QUESTIONS: dict[str, dict] = {
    "diet": {
        "text": "What's on your plate at home?",
        "them": "What should your roommate eat at home?",
        "hard": True, "weight": 1.0, "ordered": False,
        "options": [("veg", "Vegetarian", "🥦"), ("eggetarian", "Eggetarian", "🥚"), ("non_veg", "Non-veg", "🍗"), ("vegan", "Vegan", "🌱")],
    },
    "smoking": {
        "text": "Do you smoke?",
        "them": "Is smoking okay for your roommate?",
        "hard": True, "weight": 1.1, "ordered": True,
        "options": [("no", "Never", "🚭"), ("occasionally", "Occasionally", "🌬️"), ("yes", "Regularly", "🚬")],
    },
    "drinking": {
        "text": "How about drinking?",
        "them": "Roommate drinking habits you're okay with?",
        "hard": True, "weight": 1.0, "ordered": True,
        "options": [("no", "Teetotaller", "🥤"), ("socially", "Socially", "🥂"), ("regularly", "Regularly", "🍻")],
    },
    "sleep": {
        "text": "Early bird or night owl?",
        "them": "Which sleep rhythm suits you in a roommate?",
        "hard": False, "weight": 1.2, "ordered": True,
        "options": [("early_bird", "Early bird", "🌅"), ("flexible", "Flexible", "🌗"), ("night_owl", "Night owl", "🦉")],
    },
    "cleanliness": {
        "text": "How tidy is your space?",
        "them": "How tidy should your roommate be?",
        "hard": False, "weight": 1.3, "ordered": True,
        "options": [("neat", "Spotless", "✨"), ("tidy", "Reasonably tidy", "🧺"), ("easygoing", "Easygoing", "🛋️")],
    },
    "social": {
        "text": "How social are you at home?",
        "them": "Roommate social energy you'd enjoy?",
        "hard": False, "weight": 0.8, "ordered": True,
        "options": [("introvert", "Recharge solo", "📖"), ("ambivert", "A bit of both", "🙂"), ("extrovert", "Always up for plans", "🎉")],
    },
    "guests": {
        "text": "How often do you host guests?",
        "them": "Guests at the flat, how often is okay?",
        "hard": False, "weight": 1.0, "ordered": True,
        "options": [("rarely", "Rarely", "🚪"), ("sometimes", "Sometimes", "👋"), ("often", "Often", "🏠")],
    },
    "wfh": {
        "text": "Where do you work from?",
        "them": "Roommate work setup you'd be fine with?",
        "hard": False, "weight": 0.6, "ordered": True,
        "options": [("remote", "Home, full time", "💻"), ("hybrid", "Hybrid", "🔀"), ("office", "Office / college", "🏢")],
    },
    "pets": {
        "text": "Pets in the flat?",
        "them": "How do you feel about a roommate's pets?",
        "hard": False, "weight": 0.8, "ordered": True,
        "options": [("love", "Love them", "🐶"), ("fine", "Fine either way", "🐾"), ("none", "Prefer none", "🙅")],
    },
    "cooking": {
        "text": "How much do you cook?",
        "them": "How much should your roommate cook?",
        "hard": False, "weight": 0.5, "ordered": True,
        "options": [("daily", "Cook daily", "🍳"), ("sometimes", "Sometimes", "🥘"), ("never", "Order in", "🛵")],
    },
    "noise": {
        "text": "What's the volume at home?",
        "them": "Noise level you can live with?",
        "hard": False, "weight": 1.0, "ordered": True,
        "options": [("quiet", "Quiet", "🤫"), ("moderate", "Moderate", "🎧"), ("lively", "Lively", "🔊")],
    },
}

# Profile-only (never auto-asked): optional and sensitive, the user decides if it matters.
RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Spiritual", "Atheist / Agnostic", "Prefer not to say"]
LANGUAGES = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Bengali", "Marathi", "Punjabi", "Gujarati", "Odia"]

# weights used by the lifestyle similarity score
SIMILARITY_WEIGHTS = {k: v["weight"] for k, v in TRAIT_QUESTIONS.items()}
HARD_KEYS = [k for k, v in TRAIT_QUESTIONS.items() if v["hard"]]

AMENITIES = ["Wi-Fi", "AC", "Washing machine", "Geyser", "Modular kitchen", "Balcony", "Power backup", "Lift", "Covered parking", "Gym access", "Housekeeping", "RO water", "Attached bath", "Study desk"]


# ---------------------------------------------------------------------------------------
# Profile photos: free-licence portraits from Pexels (https://www.pexels.com/license/),
# chosen by hand for adult, front-facing, single-subject shots. Profiles are fictional.
# ---------------------------------------------------------------------------------------
PHOTOS_MEN = ["7581040", "37679581", "5888168", "10939845", "7276073", "20502925", "7276145", "12596735", "10987899", "4307693", "6723354", "6513156", "38325676", "5354069", "7275985", "33261949", "3130419", "10538819", "11944764", "8770964", "17910791", "6102858", "40378324", "17248602", "34379318", "6498090", "2590287", "5483063", "5483147", "39853326", "35140700", "29204802", "3725497", "15321852", "35622854", "15474961", "905470", "37835765", "5715795", "10511949", "19186828", "29508945", "16876759", "21974194", "5222524", "30109429", "2085717", "8745836", "20542649", "2232981", "6566917", "7944480", "4031377", "6075675", "7089664", "29871168", "6200777", "12076855", "7275947", "17991479", "11092039"]
PHOTOS_WOMEN = ["37951162", "38178738", "18477692", "18477690", "19576823", "17550359", "13200782", "38451334", "15618748", "14799546", "40350790", "37798732", "6084178", "16902222", "7580835", "35555305", "7451485", "10761771", "34451075", "19011883", "17184868", "17120185", "15007244", "7586065", "16927063", "15281125", "35093733", "26208424", "29035436", "15007243", "34736762", "15007349", "29105060", "32677311", "31565954", "7688183", "9159270", "8837525", "32358666"]


def avatar_for(user_id: int, gender: str) -> str:
    pool = PHOTOS_WOMEN if gender == "female" else PHOTOS_MEN if gender == "male" else (PHOTOS_WOMEN if user_id % 2 else PHOTOS_MEN)
    pid = pool[(user_id * 7) % len(pool)]
    return f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=240&h=240&fit=crop"
