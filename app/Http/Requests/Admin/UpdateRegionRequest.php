<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRegionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $regionId = $this->route('region')?->id ?? $this->route('id');
        $countryId = $this->input('country_id');

        return [
            'country_id' => ['required', 'integer', 'exists:countries,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('regions', 'name')
                    ->where(fn ($q) => $q->where('country_id', $countryId))
                    ->ignore($regionId),
            ],
            'code' => ['nullable', 'string', 'max:20'],
            'type' => ['required', 'string', 'max:50'],
            'status' => ['required', Rule::enum(Status::class)],
        ];
    }
}
