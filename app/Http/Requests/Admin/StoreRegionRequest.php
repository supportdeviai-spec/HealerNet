<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRegionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('regions', 'name')->where(fn ($q) => $q->where('country_id', $this->input('country_id'))),
            ],
            'code' => ['nullable', 'string', 'max:20'],
            'type' => ['required', 'string', 'max:50'],
            'status' => ['required', Rule::enum(Status::class)],
        ];
    }
}
