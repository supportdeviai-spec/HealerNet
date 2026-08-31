<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class PreviewCategoryWhatsAppGroupImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:'.(int) config('whatsapp_import.max_file_kilobytes', 204800),
                'extensions:xlsx,xls',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Please upload an Excel file.',
            'file.extensions' => 'Upload a valid Excel file (.xlsx or .xls).',
            'file.max' => 'The import file may not be larger than 200 MB.',
        ];
    }
}
