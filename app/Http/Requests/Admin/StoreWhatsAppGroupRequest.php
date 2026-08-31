<?php

namespace App\Http\Requests\Admin;

use App\Models\WhatsAppGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWhatsAppGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'uuid', 'exists:categories,id', 'required_if:is_primary,true'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'whatsapp_url' => ['required', 'url', 'max:2048', 'regex:/^https?:\/\/(chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com)/i'],
            'max_members' => ['nullable', 'integer', 'min:1', 'max:'.WhatsAppGroup::MAX_MEMBERS],
            'status' => ['required', Rule::in(['active', 'full', 'inactive'])],
            'is_primary' => ['sometimes', 'boolean'],
        ];
    }
}
