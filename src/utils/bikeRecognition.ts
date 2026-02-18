export const getBikeCategory = (model: string = "", details: string = ""): 'Ruta' | 'MTB' | 'Triatlon' | 'Gravel' | 'Urbana' | 'Otro' => {
    const text = (model + " " + details).toLowerCase();

    // 1. TRIATLON (Specific)
    const KEYWORDS_TRIATLON = ['shiv', 'crono', 'speed concept', 'p5', 'trinity', 'plasma', 'slice', 'ia', 'tt', 'triathlon', 'cabra', 'acoples', 'aerobar'];
    if (KEYWORDS_TRIATLON.some(k => text.includes(k))) return 'Triatlon';

    // 2. GRAVEL (Before Road/MTB due to overlap like "disc" or brands)
    const KEYWORDS_GRAVEL_MODELS = ['diverge', 'crux', 'checkpoint', 'topstone', 'revolt', 'grail', 'grizl', 'aspero', 'terra', 'silex', 'grade', 'kanzo', 'nuroad', 'warbird', 'chamois', 'exploro', 'sequoia'];
    const KEYWORDS_GRAVEL_COMPONENTS = ['grx', 'ekar', 'xplr', 'gravel', 'all-road', 'adventure', 'rx810', 'rx600', 'rx400', '40mm', '42mm', '38mm', 'flare'];
    if (KEYWORDS_GRAVEL_MODELS.some(k => text.includes(k)) || KEYWORDS_GRAVEL_COMPONENTS.some(k => text.includes(k))) return 'Gravel';

    // 3. MTB
    const KEYWORDS_MTB_MODELS = ['rockhopper', 'marlin', 'scale', 'spark', 'epic', 'stumpjumper', 'procaliber', 'x-caliber', 'talon', 'xtc', 'big nine', 'alma', 'oiz', 'scalpel', 'f-si', 'chisel', 'fuse', 'aspect', 'fuel', 'slash', 'enduro'];
    const KEYWORDS_MTB_COMPONENTS = ['deore', 'slx', 'xt', 'xtr', 'eagle', 'sx', 'nx', 'gx', 'xo1', 'xx1', 'altus', 'alivio', 'suspension', 'shox', 'fox', 'rockshox', 'mtb', 'montaña', 'trail', 'boost'];
    if (KEYWORDS_MTB_MODELS.some(k => text.includes(k)) || KEYWORDS_MTB_COMPONENTS.some(k => text.includes(k))) return 'MTB';

    // 4. RUTA
    const KEYWORDS_ROAD_MODELS = ['tarmac', 'venge', 'allez', 'roubaix', 'aethos', 'madone', 'domane', 'emonda', 'tcr', 'propel', 'defy', 'caad', 'supersix', 'systemsix', 'scultura', 'reacto', 'dogma', 'prince', 'oltre', 'aria', 'foil', 'addict'];
    const KEYWORDS_ROAD_COMPONENTS = ['105', 'tiagra', 'ultegra', 'dura-ace', 'sora', 'claris', 'red', 'force', 'rival', 'campagnolo', 'chorus', 'record', 'super record', 'ruta', 'pistera', 'road', 'di2', 'etap'];
    if (KEYWORDS_ROAD_MODELS.some(k => text.includes(k)) || KEYWORDS_ROAD_COMPONENTS.some(k => text.includes(k))) return 'Ruta';

    return 'Otro';
};
