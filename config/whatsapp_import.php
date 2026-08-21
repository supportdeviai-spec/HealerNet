<?php

return [

    /*
    | WhatsApp Community Excel import. Other uploads keep their own FormRequest
    | limits; only this feature uses these values.
    */
    'max_file_kilobytes' => (int) env('WHATSAPP_IMPORT_MAX_FILE_KB', 204800),

    'chunk_size' => (int) env('WHATSAPP_IMPORT_CHUNK_SIZE', 500),

    'max_rows' => (int) env('WHATSAPP_IMPORT_MAX_ROWS', 1000000),

    'max_stored_issues' => (int) env('WHATSAPP_IMPORT_MAX_STORED_ISSUES', 2000),

    'disk' => env('WHATSAPP_IMPORT_DISK', 'local'),

    'directory' => 'whatsapp-community-imports',

    'queue' => env('WHATSAPP_IMPORT_QUEUE', 'whatsapp-imports'),

    'job_timeout' => (int) env('WHATSAPP_IMPORT_JOB_TIMEOUT', 7200),

    'job_tries' => 1,

    'preview_ttl_minutes' => 30,

];
