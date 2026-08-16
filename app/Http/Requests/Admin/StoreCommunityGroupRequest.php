<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommunityGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'city_id' => ['required', 'integer', 'exists:cities,id'],
            'whatsapp_group_id' => [
                'required',
                'uuid',
                'exists:whatsapp_groups,id',
                Rule::unique('city_whatsapp_groups', 'whatsapp_group_id')
                    ->where(fn ($query) => $query->where('city_id', $this->input('city_id'))),
            ],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', Rule::enum(Status::class)],
        ];
    }

    public function messages(): array
    {
        return [
            'whatsapp_group_id.unique' => 'This WhatsApp group is already assigned to the selected city.',
        ];
    }
}
