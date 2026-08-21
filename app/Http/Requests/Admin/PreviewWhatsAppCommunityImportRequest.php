<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class PreviewWhatsAppCommunityImportRequest extends FormRequest
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
                'max:10240',
                'extensions:xlsx,xls,csv',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Please upload an Excel or CSV file.',
            'file.extensions' => 'Upload a valid Excel or CSV file (.xlsx, .xls, .csv).',
            'file.max' => 'The import file may not be larger than 10 MB.',
        ];
    }
}
