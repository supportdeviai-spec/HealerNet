<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'region_id' => ['required', 'integer', 'exists:regions,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('cities', 'name')->where(fn ($q) => $q->where('region_id', $this->input('region_id'))),
            ],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'status' => ['required', Rule::enum(Status::class)],
            'whatsapp_group_id' => ['nullable', 'uuid', 'exists:whatsapp_groups,id'],
        ];
    }
}
