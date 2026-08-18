<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use App\Models\CityWhatsAppGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCommunityGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var CityWhatsAppGroup|null $mapping */
        $mapping = $this->route('communityGroup');

        return [
            'city_id' => ['required', 'integer', 'exists:cities,id'],
            'whatsapp_group_id' => [
                'required',
                'uuid',
                'exists:whatsapp_groups,id',
                Rule::unique('city_whatsapp_groups', 'whatsapp_group_id')
                    ->where(fn ($query) => $query->where('city_id', $this->input('city_id')))
                    ->ignore($mapping?->id),
            ],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', Rule::enum(Status::class)],
        ];
    }

    public function attributes(): array
    {
        return [
            'city_id' => 'district',
        ];
    }

    public function messages(): array
    {
        return [
            'whatsapp_group_id.unique' => 'This WhatsApp group is already assigned to the selected district.',
        ];
    }
}
